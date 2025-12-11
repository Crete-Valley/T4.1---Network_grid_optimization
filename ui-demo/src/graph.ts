

import { select, scaleLinear, line, axisLeft, axisTop, selectAll, ScaleLinear, axisBottom, max } from "d3";
import { jres } from "./models";

export class grapher{
    static increment:number = 0x6c4a33;
    static w:number =window.innerWidth*0.60;
    static leg_h:number = window.innerHeight*0.15;
    static mx:number=50;
    static my:number = 70;
    static h:number = window.innerHeight*0.40;
    static GRAPH_SVG:string = "graph-svg";
    static PARENT_G:string="parent-g";

    //calculated in ctor
    nxt_clr:number;
    x_grid:number;
    y_grid:number;
    x_offset:number;
    y_offset:number;
    x_period:number;
    y_period:number;
    x_scale:ScaleLinear<number,number,never>
    y_scale:ScaleLinear<number,number,never>
    x_max:number;
    y_max:number;
    y_min:number;

    constructor(
        dataset:jres,
        _:number,
        private prefix:string = prefix,
    ){
        this.clear_graph_area();

        this.nxt_clr = 0xf9a825;
        this.x_grid=0;
        this.y_grid=0;
        this.x_offset=10;
        this.y_offset=10;
        this.x_period=6
        this.y_period=6

        this.x_max = 0
        this.y_min = 0;
        this.y_max = Object.values(dataset).reduce((n:number,v:number[])=>{
            const arr = grapher.to_arr(v).filter(_n=>isFinite(_n))
            let m = Math.max(...arr);
            let min = Math.min(...arr);
            m = isFinite(m) ? m : 1;
            min = isFinite(min) ? min : 1;
            if(min < this.y_min) this.y_min = min;
            if(v.length>this.x_max) this.x_max = v.length;
            if(m>n) return m;
            return n;
        },0)
        if(prefix === 'bus'){
            this.y_max/=10
        }
        this.x_scale = scaleLinear()
            .domain([0, this.x_max - 1])
            .range([0, grapher.w]);

        this.y_scale = scaleLinear().domain([this.y_min, this.y_max]).range([grapher.h, 0]);
        this.prep_graph_area()
        Object.entries(dataset).slice(0,30).forEach(([k,v])=>{
            this.draw_graph(v);
            this.add_to_legend(k);
        });
    }

    prep_graph_area() {
        const x_axis = select<SVGGElement,unknown>(`#${this.axis_id("x")}`)
        const y_axis = select<SVGGElement,unknown>(`#${this.axis_id("y")}`)
        x_axis
            .call(axisBottom(this.x_scale).tickValues(this.x_scale.ticks().filter(t=>t!==0)).tickSize(-2*grapher.h))
            .attr("transform",`translate(${grapher.mx},${grapher.h-grapher.my})`)
        
        x_axis.selectAll(".tick line")
        y_axis
            .attr("transform",`translate(${grapher.mx},-${grapher.my})`)
            .call(axisLeft(this.y_scale).tickSize(-grapher.w).tickSizeOuter(0))
    }

    clear_graph_area() {
        select("#"+this.legend_id()).selectAll("*").remove();
        const svgid = this.svg_id();
        const parentgid = this.parent_g_id();
        select("#"+svgid)
            .select("#"+parentgid)
            .remove();
        select("#"+svgid)
            .append("g")
            .attr("id",parentgid)
    } 

    draw_graph(y: number[]) {
        const data: [number, number][] = y.map((_y, _i) => [
            _i,
            _y,
        ]);
        const parent_g = select("#"+this.svg_id())
            .select("#"+this.parent_g_id());
        const lin = line()
            .x((d) => this.x_scale(d[0]))
            .y((d) => this.y_scale(d[1]));
        parent_g
            .append("path")
            .datum(data)
            .attr("class", "line")
            .attr("d", lin)
            .attr("transform", `translate(${grapher.mx}, -${grapher.my})`)
            .attr("stroke", "#" + this.nxt_clr.toString(16).padStart(6, "0").toUpperCase())
            .attr("fill", "none");
        this.nxt_clr = (this.nxt_clr + grapher.increment) % 0xffffff;
    }

    add_to_legend(
        k:string,
    ){
        const leg = select("#"+this.legend_id());
        const color = '#'+this.nxt_clr.toString(16).padStart(6, "0").toUpperCase();
        leg.append("circle").attr("cx",this.x_offset+250*this.x_grid).attr("cy",this.y_offset+25*this.y_grid).attr("r", 6).style("fill", color)
        leg.append("text").attr("x", this.x_offset+250*this.x_grid+10).attr("y", this.y_offset+25*this.y_grid+3).text(k).style("font-size", "15px").attr("alignment-baseline","middle")
        this.y_grid = (this.y_grid+1) % this.y_period;
        if(this.y_grid === 0){
            this.x_grid++;
        }
    }

    svg_id():string{
        return [this.prefix,"graph-svg"].join("-");
    }

    parent_g_id():string{
        return [this.prefix,"parent-g"].join("-");
    }

    axis_id(axis:"x"|"y"){
        return [this.prefix,axis,"axis"].join("-");
    }

    legend_id(){
        return [this.prefix,"graph-legend"].join("-")
    }

    static to_arr(v: object) {
        return Object.entries(v).reduce(
            (arr, [k, v]) => {
            arr[parseInt(k)] = v;
            return arr;
            },
            Array(Object.keys(v).length).fill(0),
        );
    }
}