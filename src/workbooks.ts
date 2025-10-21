import { jres } from './models';
let rating:Workbook|undefined = undefined;
export async function add_local(file:File){
    
    let wb = new ExcelJS.Workbook()
    switch (file.name.split('.').slice(-1)[0]){
      case 'xlsx':
        await wb.xlsx.load(await file.arrayBuffer());
        break;
      default:
        throw new Error("Unsupported file extension: "+file.name)
    }
    rating = wb;
}

//replace inequivalent comp names between CIM and profile data
function map_items(items:(string|undefined)[]){
    return items.map(c=>{
        if(!c || !(c.startsWith('machine'))) return undefined
        return (c.valueOf() as string).replace('machine','genstat').replace('_MV','')
    })
}

export async function preproc(scenario:number,profile_file:File){
    if(!rating){
        throw new Error('No scenarios file provided');
    }
    const profiles = new ExcelJS.Workbook()
    await profiles.xlsx.load(await profile_file.arrayBuffer());
    const factors = rating.getWorksheet('generator')!
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
            if ( fidx < 0) return;
            //get corresponding factor

            const f:number = factors.getRow(fidx+1).getCell(scenario+2).value as number

            //Multiply each value of component with factor
            s.eachRow(rn=>{
                if (typeof rn.getCell(pidx+3).value !== 'number') return
                rn.getCell(pidx+3).value = f*(rn.getCell(pidx+3).value as number)
                rn.getCell(pidx+3).value
                rn.commit()
            })
        })
    })
    return await profiles.xlsx.writeBuffer();
}


async function postproc_lines(result:jres){
    if(!rating){
        throw new Error("No line rating file provided");
    }
    const lines = rating.getWorksheet("line")!;
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
async function postproc_transformers(result:jres){
    if(!rating){
        throw new Error("No transformer ratings file provided")
    }
    const transformers = rating.getWorksheet("transformer")!
    const tnames = transformers.getColumn(1).values
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
            const prated = transformers.getRow(tidx+1).getCell(2).value as number*1e6
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
    if (!rating){
        throw new Error("No bus rating file provided")
    }
    const busses = rating.getWorksheet("bus")!;
    const bnames = busses.getColumn(1).values
    let loadings:jres = {}
    //if ends with _(S|V).(im|re) its a node
    //two regex because two different calculations
    const vr:RegExp = new RegExp(/_V.(im|re)$/)
    const sr:RegExp = new RegExp(/_S.(im|re)$/)
    for(const [k,v] of Object.entries(result)){
        if (vr.test(k)){

            //This calculation is similar to a combination between transformer and line ratings
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


export async function postproc_wratings(result:jres){
    return {
        "bus":await postproc_busses(result),
        "transformer":await postproc_transformers(result),
        "line":await postproc_lines(result)
    };
}