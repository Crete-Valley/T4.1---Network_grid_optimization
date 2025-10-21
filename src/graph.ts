

import { select, scaleLinear, line, axisLeft, axisTop, selectAll } from "d3";

export function get_grapher(
    

    
    base,
    x_grid,
    y_grid,
    x_offset,
    y_offset,
    x_period,
    y_period
){
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

    return {
        clear_graph_area:clear_graph_area,
        prep_graph_area:prep_graph_area,
        to_arr:to_arr,
        legend:legend,
        draw_graph:draw_graph
    }
}