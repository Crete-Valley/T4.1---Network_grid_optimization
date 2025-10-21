import { defaults, jres } from "./src/models";
import { mkapi } from "./src/util";

import { select, scaleLinear, line, axisLeft, axisTop, selectAll } from "d3";

type api = ReturnType<typeof mkapi>;

function mkbuilder(api: api) {
  const elems = () => {
    const status = <HTMLHeadingElement>(
      document.getElementById("status-header")!
    );
    const xmlform = <HTMLFormElement>document.getElementById("file-form")!;
    const simform = <HTMLFormElement>document.getElementById("sim-form")!;
    const resform = <HTMLFormElement>document.getElementById("res-form")!;
    const graphsvg = <HTMLElement>document.getElementById("graph-svg")!;
    const reslist = <HTMLUListElement>document.getElementById("res-list")!;
    return {
      simform: simform,
      xmlform: xmlform,
      resform: resform,
      status: status,
      graphsvg:graphsvg,
      reslist:reslist
    };
  };

  function mkresform(resform: HTMLFormElement, status: HTMLHeadElement): void {
    resform.onsubmit = async (ev) => {
      ev.preventDefault();
      const target: HTMLInputElement = <HTMLInputElement>(
        document.getElementById("res-input")
      );
      if (target && target.value) {
        const sim_name = target.value;
        try {
          const res = Object.entries(Object.values(await api.get_result(sim_name))[0] as jres).slice(0,35);
          status.innerText = `\nSuccessfully fetched ${sim_name} result`;
          clear_graph_area()
          x_grid = 0;
          y_grid=0;
          const max = res.reduce((n:number,[k,v])=>{
            const m = Math.max(...to_arr(v))
            if(m>n) return m
            return n
          },0)
          res.forEach(([k,v],i)=>{
            if(k.trim() === "time") return
            draw_graph(to_arr(v),max)
            legend(k,'#'+base.toString(16).padStart(6, "0").toUpperCase(),i)
          })
        } catch (e) {
          status.innerText = `\nError fetching result:\n ${e}`;
        }
      }
    };
  }

  function mksimform(simform: HTMLFormElement, status: HTMLHeadingElement) {
    simform.onsubmit = async (ev) => {
      ev.preventDefault();
      if (ev.target) {
        const data = new FormData(ev.target as any);
        const params = defaults;
        data.forEach((v, k) => {
          params[k] = v;
        });
        try {
          const res = await api.runsim(params);
          status.innerText = `\nSuccessfully ran ${params.name}`;
        } catch (e) {
          status.innerText = `\nError running Sim:\n ${e}`;
        }
      }
    };
  }

  function mkxmlform(
    xmlform: HTMLFormElement,
    status: HTMLHeadingElement,
  ): void {
    xmlform.onsubmit = async (ev) => {
      ev.preventDefault();
      const target: HTMLInputElement = <HTMLInputElement>(
        document.getElementById("xml-input")
      );
      if (target && target.files) {
        const file: File = target.files[0];
        try {
          await api.upfile(file, "xml");
          status.innerText = `\nSuccessfully uploaded ${file.name}`;
        } catch (e) {
          status.innerText = `\nError uploading XML:\n ${e}`;
        }
      }
    };
  }

  return {
    elems: elems,
    mksimform: mksimform,
    mkxmlform: mkxmlform,
    mkresform: mkresform,
  };
}

const api: api = mkapi();
const builder = mkbuilder(api);
const elems = builder.elems();
builder.mkxmlform(elems.xmlform, elems.status);
builder.mksimform(elems.simform,elems.status)
builder.mkresform(elems.resform, elems.status);
let base = 0xf9a825;
const increment = 0x6c4a33;
const w =window.innerWidth*0.6;
const m=50;
const h = window.innerHeight*0.75;
const size = 301;
const leg = select("#graph-legend")
const xScale = scaleLinear()
  .domain([0, size - 1])
  .range([0, w]);

const yScale = scaleLinear().domain([-size+1, size-1]).range([h, 0]);

function prep_graph_area() {
  const x_axis = select<SVGGElement,unknown>(`#x-axis`)
  const y_axis = select<SVGGElement,unknown>(`#y-axis`)

  x_axis
    .call(axisTop(xScale).tickValues(xScale.ticks().filter(t=>t!==0)).tickSize(-2*h))
    .attr("transform",`translate(${m},${(h/2)})`)

  selectAll(".tick line")
  .attr("transform",`translate(0,${-h/2})`)
  y_axis
    .attr("transform",`translate(${m},0)`)
    .call(axisLeft(yScale).tickSize(-w).tickSizeOuter(0))
}

function clear_graph_area() {
  const p = select(`#graph-svg`).select("#parent-g").remove();
  select(`#graph-svg`).append("g").attr("id", "parent-g");
} 

const x: number[] = Array.from(Array(size), (_, idx) => idx);

function draw_graph(y: number[], max: number) {
  const data: [number, number][] = x.map((_x, _i) => [
    _x,
    (y[_i] * (size - 1)) / max,
  ]);
  const parent_g = select("#parent-g");
  const lin = line()
    .x((d) => xScale(d[0]))
    .y((d) => yScale(d[1]));

  parent_g
    .append("path")
    .datum(data)
    .attr("class", "line")
    .attr("d", lin)
    .attr("transform", `translate(50, 0)`)
    .attr("stroke", "#" + base.toString(16).padStart(6, "0").toUpperCase())
    .attr("fill", "none");
  base = (base + increment) % 0xffffff;
}

let x_grid=0;
let y_grid=0;
let x_offset=10;
let y_offset=10;
let x_period=6
let y_period=6

function legend(
  k:string,
  color:string,
  idx:number
){
  // Handmade legend
  leg.append("circle").attr("cx",x_offset+220*x_grid).attr("cy",y_offset+25*y_grid).attr("r", 6).style("fill", color)
  leg.append("text").attr("x", x_offset+220*x_grid+10).attr("y", y_offset+25*y_grid+3).text(k).style("font-size", "15px").attr("alignment-baseline","middle")
  y_grid = (y_grid+1) % y_period;
  if(y_grid === 0){
    x_grid = (x_grid+1) % x_period;
  }
}

function to_arr(v: object) {
  return Object.entries(v).reduce(
    (arr, [k, v]) => {
      arr[parseInt(k)] = v;
      return arr;
    },
    Array(Object.keys(v).length).fill(0),
  );
}

prep_graph_area();


setInterval(()=>{
  api.get_results()
    .then((res)=>{
      const coerce:HTMLLIElement[] = (res['result'] as string[]).map(s=>{
        const li = document.createElement("li")
        li.innerText = s.split('.')[0];
        return li;
      })
      elems.reslist.innerHTML = ""
      coerce.forEach(l=>elems.reslist.appendChild(l))
    })
},3000)