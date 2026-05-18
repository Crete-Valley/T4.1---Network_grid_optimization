from logging import Logger,basicConfig,_nameToLevel,getLogger
from threading import Lock
import io
from fdb import fdb
from sim import simulator as s
import multiprocessing as mp
import pandas as pd
from typing import Any,Callable
import os
class api_impl:
    __fdb:fdb
    __mlock:Lock
    __flocks:dict[str,Lock]
    __dlocks:dict[str,Lock]
    l:Logger
    res_root_dir:str
    fdb_root_dir:str
    def __init__(self):
        log_level = api_impl._get_env('DPS_LOG_LEVEL')
        self.res_root_dir = os.environ.get('DPSV_RES_ROOT_DIR',"/tmp")
        if log_level.upper() not in _nameToLevel:
            raise Exception(f'Unrecognized log level: {log_level}')
        basicConfig(level=_nameToLevel[log_level])
        self.l = getLogger("DPSV")
        self.l.info('Starting with: ')
        self.l.info(f'DPS_LOG_LEVEL={log_level}')
        self.fdb_root_dir = api_impl._get_env('DPS_ROOT')
        self.l.info(f'DPS_ROOT={self.fdb_root_dir}')
        self.__fdb = fdb(self.fdb_root_dir)
        self.__mlock = Lock()
        self.__flocks = {}
        self.__dlocks = {}
    
    def lock_dir(self, rtype: str) -> Lock:
        with self.__mlock:
            if rtype not in self.__dlocks:
                self.__dlocks[rtype] = Lock()
            return self.__dlocks[rtype]

    def lock_file(self, rtype: str, actual_name: str) -> Lock:
        lock_key = f"{rtype}:{actual_name}"
        with self.__mlock:
            if lock_key not in self.__flocks:
                self.__flocks[lock_key] = Lock()
            return self.__flocks[lock_key]
    
    def __lock_release_exception(self,l:Lock,fn:Callable[[],Any]):
        try:
            return fn()
        except Exception as e:
            raise e
        finally:
            l.release()

    @staticmethod
    def sim_exec(body:dict[str,Any],res_root_dir,fdb_root_dir):
        from fdb import fdb
        local_fdb = fdb(fdb_root_dir)
        s.set_fdb(local_fdb)
        sim = s(**body,res_root_dir=res_root_dir)
        sim.configure()
        sim.start()
    
    def _run(self,body:dict[str,Any])->None:
        #at this point
        #sim guaranteed to have name
        profile_name = body['use_profile']
        sim_name = body['name']
        dlock = self.lock_dir("xml")
        dlock.acquire()
        xml_name = self.__lock_release_exception(
            dlock,
            lambda: self.__fdb.search_files(body['use_xml'], "xmls", once=True)[0]
        )
        s.set_fdb(self.__fdb)
        body['use_xml'] = xml_name
        if profile_name is not None:
            dlock = self.lock_dir("profile")
            dlock.acquire()
            profile_name = self.__lock_release_exception(
                dlock,
                lambda: self.__fdb.search_files(profile_name, "profiles", once=True)[0]
            )
            body['use_profile']=profile_name
        #at this point, we have actual xml, and actual profile name if exists
        #we need to acquire both locks + an additional sim name lock 
        #so long as the sim runs:
        profile_lock = None
        if profile_name is not None:
            profile_lock = self.lock_file("profile",profile_name)
            profile_lock.acquire()
        
        xml_lock = self.lock_file("xml",xml_name)
        xml_lock.acquire()
        
        sim_lock = self.lock_file("sim",sim_name)
        sim_lock.acquire()
        try:
            process = mp.Process(
                target=self.sim_exec,
                args=(body,self.res_root_dir,self.fdb_root_dir)
            )
            
            process.start()
            process.join()
            if process.exitcode != 0:
                raise RuntimeError(f"Simulation engine failed with exit code {process.exitcode}")
        except Exception as e:
            raise e
        finally:
            if profile_lock is not None:
                profile_lock.release()
            xml_lock.release()
            #Before sim_lock.release we need to retrieve result
            def retrieve():
                sim_dir = f'{self.res_root_dir}/{sim_name}'
                p = f'{sim_dir}/run.csv'
                df = pd.read_csv(p)

                #STRIP SPACES
                df.columns = [col.strip() for col in df.columns]
                #DF->BYTES
                output_buffer = io.StringIO()
                df.to_csv(output_buffer)
                self._tsaddraw("result",f'{sim_name}.csv',output_buffer.getvalue().encode('utf-8'))
                try:
                    from shutil import rmtree
                    rmtree(sim_dir)
                except Exception as e:
                    self.l.warning(f"Failed to remove sim directory {sim_dir}: {e}")
                return output_buffer.getvalue().encode('utf-8')
            
            file = self.__lock_release_exception(
                sim_lock,
                lambda: retrieve()
            )
        
        
    def _jtsget(self,rtype:str,rname:str)->dict[str,Any]:
        self.__fdb.check(rtype)
        subdir=rtype+'s'
        dlock = self.lock_dir(rtype)
        dlock.acquire()
        actual_name = self.__lock_release_exception(
            dlock,
            lambda: self.__fdb.search_files(rname, subdir, once=True)[0]
        )
        flock = self.lock_file(rtype,actual_name)
        flock.acquire()
        result = self.__lock_release_exception(
            flock,
            lambda: self.__fdb.tsget(rtype,actual_name)
        )
        return {x[0]:x[1].to_dict() for x in result.items()}
    
    def _tslist(self,rtype:str)->list[str]:
        self.__fdb.check(rtype)
        dlock = self.lock_dir(rtype)
        dlock.acquire()
        result = self.__lock_release_exception(
            dlock,
            lambda: self.__fdb.tslist(rtype)
        )
        return result
    
    def _xlist(self)->list[str]:
        dlock = self.lock_dir("xml")
        dlock.acquire()
        result = self.__lock_release_exception(
            dlock,
            lambda: self.__fdb.xmllist()
        )
        return result
    
        
    def _tsaddraw(self,rtype:str,rname:str,content:Any):
        self.__fdb.check(rtype)
        dlock = self.lock_dir(rtype)
        dlock.acquire()
        flock = self.lock_file(rtype,rname)
        flock.acquire()
        self.__lock_release_exception(
            dlock,
            lambda: self.__lock_release_exception(
                flock,
                lambda: self.__fdb.tsaddraw(rtype,rname,content)
            )
        )
    
    def _tsdelete(self,rtype:str,rname:str)->None:
        self.__fdb.check(rtype)
        subdir=rtype+'s'
        dlock = self.lock_dir(rtype)
        dlock.acquire()
        def __chain():
            actual_name = self.__fdb.search_files(rname, subdir, once=True)[0]
            flock = self.lock_file(rtype, actual_name)
            flock.acquire()
            return self.__lock_release_exception(
                flock,
                lambda: self.__fdb.tsdelete(rtype, actual_name) # Pass actual name
            )
            
        self.__lock_release_exception(
            dlock,
            __chain
        )
    
    def _xaddraw(self, content:Any):
        dlock = self.lock_dir("xml")
        dlock.acquire()
        filename = content.filename.removesuffix('.zip')
        flock = self.lock_file("xml",filename)
        flock.acquire()
        self.__lock_release_exception(
            dlock,
            lambda: self.__lock_release_exception(
                flock,
                lambda: self.__fdb.xmlput(content)
            )
        )
    
    def _xdelete(self,rname:str)->None:
        dlock = self.lock_dir("xml")
        dlock.acquire()
        def __chain():
            actual_name = self.__fdb.search_files(rname, "xmls", once=True)[0]
            flock = self.lock_file("xml", actual_name)
            flock.acquire()
            return self.__lock_release_exception(
                flock,
                lambda: self.__fdb.xmldelete(actual_name) # Pass actual name
            )
            
        self.__lock_release_exception(
            dlock,
            __chain
        )
    
    def _get_env(env:str)->str:
        res = os.getenv(env)
        if res is None:
            raise Exception(f'Needed env variable {env} is not set')
        return res