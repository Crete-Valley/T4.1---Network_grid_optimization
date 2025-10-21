import * as XL from 'exceljs'
import {readFileSync,writeFileSync} from 'fs'
import { defaults, json_object, sim,jres} from './src/models'


/*
    If a grid component has an entry in the factors datasheet
    Its active/reactive power entries get multiplied by that factor
*/
async function preproc(scenario:number,ps:string,fs:string){
    let fname:string = ps.split('/')[1]
    const profiles = new XL.Workbook()
    const _factors = new XL.Workbook()
    await profiles.xlsx.readFile(ps)
    await _factors.xlsx.readFile(fs)
    const factors = _factors.getWorksheet('factors')!
    const ncol = factors.getColumn(1).values
    profiles.eachSheet((s,sid)=>{
        //get names
        let r =s.getRow(3).values as (string|undefined)[]
        //replace keywords
        r = map_items(r)
        r.forEach((c,pidx)=>{
            //if comp name has no entry in factors exit
            if(!c) return;
            const fidx = ncol.indexOf(c)
            if (fidx < 0) return;

            //get corresponding factor
            const f:number = factors.getRow(fidx+1).getCell(scenario+3).value as number

            //Multiply each value of component with factor
            s.eachRow(rn=>{
                if (typeof rn.getCell(pidx+3).value !== 'number') return
                rn.getCell(pidx+3).value = f*(rn.getCell(pidx+3).value as number)
                rn.getCell(pidx+3).value
                rn.commit()
            })
        })
    })

    //write modified file
    const filename:string = `scenario_${scenario}_${fname}`
    await profiles.xlsx.writeFile(filename)
    return filename
}

//replace inequivalent comp names between CIM and profile data
function map_items(items:(string|undefined)[]){
    return items.map(c=>{
        if(!c || !(c.startsWith('machine'))) return undefined
        return (c.valueOf() as string).replace('machine','genstat').replace('_MV','')
    })
}

//protection
function getenv(){
    const estr = readFileSync('.env',{encoding:'utf-8'})
    let eobj:json_object = {}
    for(let line of estr.split('\n')){
        let [k,v] = line.split('=')
        eobj[k] = v
    }
    return {
        ps:eobj['ps'] as string,
        scenario:Number(eobj['scenario']),
        fs:eobj['fs'] as string,
        xml:eobj['xml'] as string,
        lines:eobj['lines'] as string,
        trafos:eobj['trafos'] as string,
        busses:eobj['busses'] as string
    }
}

//dps server
const sv_addr:string = 'http://localhost:5000'

//------Send Requirements------
//this pretty much amounts to a powerflow simulation
async function send_profile():Promise<string>{
    const e = getenv()
    const filename:string = await preproc(e.scenario,e.ps,e.fs)
    const body = new FormData()
    const profile_name:string = e.ps.split('/')[1].replace('.xlsx','')
    body.append('file',new Blob([readFileSync(filename)]),filename)
    await fetch(`${sv_addr}/ts/profile`,{method:'POST',body:body})
    return profile_name
}

//Send system (CIM data format)
async function send_xml():Promise<string>{
    const e = getenv()
    const body = new FormData()
    const xml_name:string = e.xml.split('/')[1].replace('.zip','')
    body.append('file',new Blob([readFileSync(e.xml)]),e.xml.split('/')[1])
    await fetch(`${sv_addr}/xml`,{method:'POST',body:body})
    return xml_name
}
//------Send Requirements------

//The request hangs while the simulation runs for now
//Until a decoupled state check is implemented, where the OK
//Response simply states that the sim has started
async function start_sim(params:Partial<sim>):Promise<string>{
    let p = structuredClone(defaults)
    for(let [k,v] of Object.entries(params)){
        p[k] = v
    }
    console.log('-------Sim Parameters------')
    console.log(JSON.stringify(p,null,1))
    console.log('-------Sim Parameters------')
    await fetch(`${sv_addr}/s`,{method:'POST',body:JSON.stringify(p),headers:{'Content-Type':'application/json','Accept':'application/json'}})
    return p.name
}

async function get_result(sim_name:string):Promise<jres>{
    const res = await fetch(`${sv_addr}/jts/result/${sim_name}`)
    let result = (await res.json())[sim_name.slice(1,sim_name.length)]
    for(const [k,v] of Object.entries(result)){
        delete result[k]
        result[k.replace(" ","")] = v
    }
    return result
}

/*
    Use ratings data to calculate line/transformer loadings and
    bus voltages from sim results
*/
// Imag/Inom rate in percent for lines
async function postproc_lines(result:jres){
    const e = getenv()
    const lines =(await new XL.Workbook().xlsx.readFile(e.lines)).getWorksheet('lines')!
    const lnames = lines.getColumn(1).values
    let loadings:jres = {}
    const r:RegExp = new RegExp(/^lne_.*_I_\d\.(im|re)$/)
    for(const [k,v] of Object.entries(result)){
        if (r.test(k)){

            //find other complex coefficients
            let otherk:string = k.endsWith(".im") ? k.replace("im","re") : k.replace("re","im")
            let otherv:number[] = result[otherk]
            const compname = k.slice(0,k.indexOf('_I_'))
            let comb:number[] = []
            const lidx = lnames.indexOf(compname)
            if(lidx === -1){
                continue
            }

            //get Inom from sheet
            const inom = lines.getRow(lidx+1).getCell(2).value as number*1e3

            //map values
            Object.values(v).forEach((n,i)=>{
                //calculate magnitude in this case
                const mag = Math.sqrt(Math.pow(n,2)+Math.pow(otherv[i],2))
                comb.push(100*mag/inom)
            })

            //add to new result
            loadings[compname+'_%L'] = comb
        }
    }
    return loadings
}

//P/Prated in percent for transformers
async function postproc_trafos(result:jres){
    const e = getenv()
    const trafos = (await new XL.Workbook().xlsx.readFile(e.trafos)).getWorksheet('transformers')!
    const tnames = trafos.getColumn(1).values
    let loadings:jres = {}
    const r:RegExp = new RegExp(/^trf_.*_Pinj$/)
    for(const [k,v] of Object.entries(result)){
        if (r.test(k)){

            //n==pinj directly in this case
            const compname = k.slice(0,k.indexOf('_Pinj'))

            //get Prated from sheet
            const tidx = tnames.indexOf(compname)
            if(tidx === -1){
                continue
            }
            const prated = trafos.getRow(tidx+1).getCell(2).value as number*1e6
            let comb:number[] = []

            //map values
            Object.values(v).forEach(n=>{
                comb.push(100*Math.abs(n/prated))
            })

            //add to new result
            loadings[compname+'_%L'] = comb
        }
    }
    return loadings
}

async function postproc_busses(result:jres){
    const e = getenv()
    const busses =(await new XL.Workbook().xlsx.readFile(e.busses)).getWorksheet('busses')!
    const bnames = busses.getColumn(1).values
    let loadings:jres = {}
    //if ends with _(S|V).(im|re) its a node
    //two regex because two different calculations
    const vr:RegExp = new RegExp(/_V.(im|re)$/)
    const sr:RegExp = new RegExp(/_S.(im|re)$/)
    for(const [k,v] of Object.entries(result)){
        if (vr.test(k)){

            //This calculation is similar to a combination between trafo and line ratings
            //calculation
            let isimaginary:boolean = k.endsWith(".im")
            let otherk:string = isimaginary ? k.replace("im","re") : k.replace("re","im")
            let otherv:number[] = result[otherk]
            const compname = k.slice(0,k.indexOf('_V'))
            let combm:number[] = []
            let combp:number[] = []
            Object.values(v).forEach((n,i)=>{
                const othern = otherv[i]
                //use atan2 to avoid y/x sign edge case shennanigans
                const mag = Math.sqrt(Math.pow(n,2)+Math.pow(othern,2))
                const phase = isimaginary ? Math.atan2(n,othern) : Math.atan2(othern,n)
                combp.push(phase)
                const bidx = bnames.indexOf(compname)
                if(bidx !== -1){
                    const vnom = busses.getRow(bidx+1).getCell(2).value as number*1e3
                    combm.push(mag/vnom)
                }

            })
            loadings[compname+'_bus_V_mag'] = combm
            loadings[compname+'_bus_V_phase'] = combp
        }else if(sr.test(k)){
            //Here push im as q and re as p directly

            let isimaginary:boolean = k.endsWith(".im")
            let otherk:string = isimaginary ? k.replace("im","re") : k.replace("re","im")
            let otherv:number[] = result[otherk]
            const compname = k.slice(0,k.indexOf('_V'))
            let combp:number[] = []
            let combq:number[] = []
            Object.values(v).forEach((n,i)=>{
                const othern = otherv[i]
                if(isimaginary){
                    combq.push(n/1e6)
                    combp.push(othern/1e6)
                }else{
                    combp.push(n/1e6)
                    combq.push(othern/1e6)
                }
            })
            loadings[compname+'_bus_P'] = combp
            loadings[compname+'_bus_Q'] = combq
        }
    }
    return loadings
}

//run a sim and write a result file ( without rated calculations )
async function run(){
    const p_name = await send_profile()
    const x_name = await send_xml()
    const s_name = await start_sim({name:'sim-run-test',use_profile:p_name,use_xml:x_name})
    const jresult = await get_result(s_name)
    writeFileSync(`${s_name}.json`,JSON.stringify(jresult))
}

//conduct rated calculations seperately
//change sim name if needed ( including in the defaults object in src/models.ts)
//Make sure sim component names in ratings/profile data only differ a little from those
// in the CIM format, it is possible to provide a name conversion map to dps-server
async function postproc_wratings(){
    for(const f of [postproc_busses,postproc_lines,postproc_trafos]){
        let loadings = await f(await get_result('sim-run-test'))
        console.log('------------------------------------------------')
        console.log(Object.keys(loadings).length)
        console.log('------------------------------------------------')
    }
}
