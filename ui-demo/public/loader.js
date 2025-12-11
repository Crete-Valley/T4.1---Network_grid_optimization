function nxhr_builder(elem,path){
    return ()=>{
        const e = document.getElementById(elem)
        let xhr = new XMLHttpRequest()
        xhr.onreadystatechange = function(){
            if(xhr.readyState == 4 && xhr.status==200){
                if(e) e.innerHTML = xhr.responseText
                else console.log(`Expected to find element ${elem}`)
            }
        }
        xhr.open('GET',path)
        xhr.send()
    }
}

function derive(values){
    let result = []
    for(let i=0;i<values.length-1;i++){
        result.push((values[i+1]-values[i])/2)
    }
    return result;
}

function one_val(res,idx){
    return Object.entries(res).reduce((obj,[k,v])=>{
        return {...obj,[k]:v[idx]}
    },{})
}

function highlight(res){
    Object.entries(res).forEach(([k,v])=>{
        //the g tags
        const elems = document.querySelectorAll('[id*="'+k+'"]');
        elems.forEach(e/*g tag */=>{
            const shapes = e.querySelectorAll('*'); 
            shapes.forEach(s => {
            console.log(v)
            const r = 255*v;
            const g = 255*(1-v);
            const c = `rgba(${r},${g},0,0.5)`
            //s.setAttribute('stroke', c);
            s.setAttribute('fill', c);
            });
        })
    })
}

const slider = document.getElementById("timestep")

nxhr_builder("svg-container","/sensitive/crete.svg")()
let data = JSON.parse(localStorage.getItem("ppd_bus_res"));

//remove phases
//modify magnitude keys to correspond to svg component names
data = Object.entries(data).reduce((obj,[k,v])=>{
    if(k.endsWith("phase")) return obj;
    k = k.split(" ").slice(1).join(" ");
    k = k.replace("_%V_mag","");
    let derived = derive(v);
    derived = derived.map(value=>Math.abs(value));
    const max = Math.max(...derived);
    const min = Math.min(...derived);
    derived = derived.map(value1=>(value1 - min)/(max - min));
    return {...obj, [k]:v};
},{})


//at which index are we highlighting
//controller by a slider
let t = 0;
let wdata = one_val(data,t);
highlight(wdata)
slider.addEventListener("change",(ev)=>{
    t = ev.target.value;
    wdata = one_val(data,t)
    highlight(wdata)
})

