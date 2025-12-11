import { defaults, jres } from "./src/models";
import { mkapi } from "./src/api";
import {grapher} from "./src/graph";
import { add_local, postproc_wratings, preproc } from "./src/workbooks";

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
    const sysviewb = <HTMLButtonElement>document.getElementById("sysview-button")!;
    return {
      simform: simform,
      sysviewb:sysviewb,
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
          const res = Object.entries(
            Object.values(await api.get_result(sim_name))[0] as jres
          ).reduce((obj,[k,v])=>{
            return {...obj,[k.trimStart()]:v}
          },{})
          status.innerText = `\nSuccessfully fetched ${sim_name} result`;
          const loadings = await postproc_wratings(res);
          Object.entries(loadings).forEach(([k,v],i)=>{
            new grapher(v,i,k);
          })
        } catch (e) {
          status.innerText = `\nError fetching result:\n ${e}`;
        }
      }
    };
  }

  function mksysview(
    sysview:HTMLButtonElement,
    status:HTMLHeadingElement
  ){
    sysview.onclick =  async (ev)=>{
      const target: HTMLInputElement = <HTMLInputElement>(
        document.getElementById("res-input")
      );
      const sim_name = target.value;
      try {
        const res = Object.entries(
          Object.values(await api.get_result(sim_name))[0] as jres
        ).reduce((obj,[k,v])=>{
          return {...obj,[k.trimStart()]:v}
        },{})
        status.innerText = `\nSuccessfully fetched ${sim_name} result`;
        const ppd_bus_res = await postproc_wratings(res);
        localStorage.setItem("ppd_bus_res",JSON.stringify(ppd_bus_res.bus))
        window.location.href = "/sysview"
      } catch (e) {
        status.innerText = `\nError fetching result:\n ${e}`;
      }
    }
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
        const scenario:number = Number((document.getElementById("scenario-input") as HTMLInputElement).value)
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
    mksysview:mksysview,
    mkratingform:mkratingform
  };
}

const api: api = mkapi();
const builder = mkbuilder(api);
const elems = builder.elems();
builder.mkxmlform(elems.xmlform, "xml", elems.status);
builder.mkprofileform(elems.profileform, elems.status);
builder.mkratingform(elems.ratingform)

builder.mksimform(elems.simform,elems.status);
builder.mkresform(elems.resform, elems.status);
builder.mksysview(elems.sysviewb,elems.status);

setInterval(()=>{
  api.get_results()
    .then((res)=>{
      const coerce:HTMLLIElement[] = (res['lst'] as string[]).map(s=>{
        const li = document.createElement("li")
        li.innerText = s.split('.')[0];
        return li;
      })
      elems.reslist.innerHTML = ""
      coerce.forEach(l=>elems.reslist.appendChild(l))
    })
},3000)
