from logging import Logger,basicConfig,_nameToLevel,getLogger
from fdb import fdb
from sim import simulator as s
from typing import Any
import os
class api_impl:
    __fdb:fdb
    l:Logger
    def __init__(self):
        log_level = api_impl._get_env('DPS_LOG_LEVEL')
        if log_level.upper() not in _nameToLevel:
            raise Exception(f'Unrecognized log level: {log_level}')
        basicConfig(level=_nameToLevel[log_level])
        self.l = getLogger("DPSV")
        self.l.info('Starting with: ')
        self.l.info(f'DPS_LOG_LEVEL={log_level}')
        root_dir = api_impl._get_env('DPS_ROOT')
        self.l.info(f'DPS_ROOT={root_dir}')
        self.__fdb = fdb(root_dir)
    
    def _run(self,body:dict[str,Any])->None:
        s.set_fdb(self.__fdb)
        sim = s(**body)
        sim.configure()
        sim.start()
    
    def _tsadd(self,rtype:str,path:str)->None:
        self.__fdb.tslink(rtype,path)
        
    def _tsaddraw(self,rtype:str,rname:str,content:Any):
        self.__fdb.tsaddraw(rtype,rname,content)
        
    def _jtsget(self,rtype:str,rname:str)->dict[str,Any]:
        return {x[0]:x[1].to_dict() for x in self.__fdb.tsget(rtype,rname).items()}
    
    def _tsdelete(self,rtype:str,rname:str)->None:
        self.__fdb.tsdelete(rtype,rname)
    
    def _tslist(self,rtype:str)->list[str]:
        return self.__fdb.tslist(rtype)
    
    def _xadd(self,path:str)->None:
        self.__fdb.xmllink(path)
    
    def _xaddraw(self, content:Any):
        self.__fdb.xmlput(content)
    
    def _xdelete(self,rname:str)->None:
        self.__fdb.xmldelete(rname)
    
    def _xlist(self)->list[str]:
        return self.__fdb.xmllist()
    
    def _get_env(env:str)->str:
        res = os.getenv(env)
        if res is None:
            raise Exception(f'Needed env variable {env} is not set')
        return res