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

export const defaults: sim = {
  duration: 300,
  timestep: 1,
  name: "simrun-default",
  freq: 50,
  domain: "SP",
  solver: "NRP",
  opf: false,
  use_xml: "",
};
