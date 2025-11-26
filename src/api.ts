export type json_value = string | number | boolean | json_object | json_array;
export type json_array = Array<json_value>;
export interface json_object {
  [key: string]: json_value;
}

export type jres = Record<string, number[]>;

export interface sim {
  duration: number;
  timestep: number;
  name: string;
  freq: number;
  opf: boolean;
  domain: string;
  solver: string;
  replace_map?: Record<string, string>;
  use_profile?: string;
  use_xml?: string;
}

const handle_err:(json:object)=>object = (json:object)=>{
  if(json && "detail" in json){
    throw (json.detail as any).split('\n').filter(s=>s.trim().length !==0).slice(-1)[0]
  }
  return json
}

export function mkapi() {
  return {
    upfile: async (file: File|ArrayBuffer, ep: string,file_name:string) => {
      const body = new FormData();
      body.append("file", new Blob([file]), file_name);
      const res = await fetch(`/${ep}`, { method: "POST", body: body });
      const json = await res.json();
      return handle_err(json);
    },
    get_results: async () => {
      const res = await fetch(`/ts/result`);
      const json = await res.json();
      return handle_err(json);
    },
    get_result: async (fname: string) => {
      const res = await fetch(`/jts/result/${fname}`);
      const json = await res.json();
      return handle_err(json);
    },
    runsim: async (params: sim) => {
      const res = await fetch(`/s`, {
        method: "POST",
        body: JSON.stringify(params),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      const json = await res.json();
      return handle_err(json);
    },
  };
}


/*


*/