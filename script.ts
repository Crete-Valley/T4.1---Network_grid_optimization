import { defaults, jres } from "./src/models";
import { mkapi } from "./src/api";
import {get_grapher} from "./src/graph";
import { add_local, preproc } from "./src/workbooks";




    
let base = 0xf9a825;
let x_grid=0;
let y_grid=0;
let x_offset=10;
let y_offset=10;
let x_period=6
let y_period=6

const {
  clear_graph_area,
  draw_graph,
  prep_graph_area,
  to_arr,
  legend,
} = get_grapher(
  base,
  x_grid,
  y_grid,
  x_offset,
  y_offset,
  x_period,
  y_period
)

type api = ReturnType<typeof mkapi>;

function mkbuilder(api: api) {
  const elems = () => {
    const status = <HTMLHeadingElement>(
      document.getElementById("status-header")!
    );
    const xmlform = <HTMLFormElement>document.getElementById("xml-form")!;
    const profileform = <HTMLFormElement>document.getElementById("profile-form")!;
    const ratingform = <HTMLFormElement>document.getElementById("rating-form")!;
    const simform = <HTMLFormElement>document.getElementById("sim-form")!;
    const resform = <HTMLFormElement>document.getElementById("res-form")!;
    const graphsvg = <HTMLElement>document.getElementById("graph-svg")!;
    const reslist = <HTMLUListElement>document.getElementById("res-list")!;
    return {
      simform: simform,
      xmlform: xmlform,
      resform: resform,
      profileform:profileform,
      ratingform:ratingform,
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

  function mkratingform(
    form:HTMLFormElement
  ){
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      const target: HTMLInputElement = <HTMLInputElement>(
        document.getElementById("rating-input")
      );
      if (target && target.files) {
        const file: File = target.files[0];
        add_local(file)
      }
    };
  }

  function mkxmlform(
    form: HTMLFormElement,
    rtype:string,
    status: HTMLHeadingElement,
  ): void {
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      const target: HTMLInputElement = <HTMLInputElement>(
        document.getElementById(rtype+"-input")
      );
      if (target && target.files) {
        const file: File = target.files[0];
        try {
          await api.upfile(file, rtype,file.name);
          status.innerText = `\nSuccessfully uploaded ${file.name}`;
        } catch (e) {
          status.innerText = `\nError uploading ${rtype}:\n ${e}`;
        }
      }
    };
  }

  
  function mkprofileform(
    profileform: HTMLFormElement,
    status: HTMLHeadingElement,
  ): void {
    profileform.onsubmit = async (ev) => {
      ev.preventDefault();
      const file_input: HTMLInputElement = <HTMLInputElement>(
        document.getElementById("profile-input")
      );
      if (file_input && file_input.files) {
        const pre_file: File = file_input.files[0];
        const scenario:number = Number(<HTMLInputElement>document.getElementById("scenario-input")!.value)
        const file = await preproc(scenario,pre_file);
        try {
          await api.upfile(file, "ts/profile",pre_file.name);
          status.innerText = `\nSuccessfully uploaded ${pre_file.name}`;
        } catch (e) {
          status.innerText = `\nError uploading profile:\n ${e}`;
        }
      }
    };
  }

  return {
    elems: elems,
    mksimform: mksimform,
    mkxmlform: mkxmlform,
    mkprofileform:mkprofileform,
    mkresform: mkresform,
    mkratingform:mkratingform
  };
}

const api: api = mkapi();
const builder = mkbuilder(api);
const elems = builder.elems();
builder.mkxmlform(elems.xmlform, "xml", elems.status);
builder.mkprofileform(elems.profileform, elems.status);
builder.mkratingform(elems.ratingform)

builder.mksimform(elems.simform,elems.status)
builder.mkresform(elems.resform, elems.status);


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