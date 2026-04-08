import os
from typing import Optional, Any,List,Dict
from pydantic import BaseModel,Field,model_validator
from functools import reduce
class JsonTimeseries(BaseModel):
    time: List[float|int] = Field(
        ..., 
        description="**Required.** A list of time values, one of integer timesteps or unix timestamps."
    )
    
    model_config = {
        "model_show_config":False,
        "extra": "allow",
        "json_schema_extra": {
            "example": {
                "time": [0.0, 0.5, 1.0, 1.5, 2.0],
                "sensor_x": [10.1, 10.2, 10.3, 10.4, 10.5],
                "sensor_y": [5.1, 5.2, 5.3, 5.4, 5.5],
                "temperature": [25.0, 25.1, 25.2, 25.1, 25.0]
            }
        }
    }
    
    @model_validator(mode='before')
    @classmethod
    def check_all_fields_are_list_of_float(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        #is json
        if not isinstance(data, dict):
            raise ValueError(f"Object must be a dict.")
        #is list
        l = len(data['time'])
        for key, value in data.items():
            if not isinstance(value, list):
                raise ValueError(f"Field '{key}' must be a list.")
            if key == "time":
                continue
            #is float
            if not reduce(lambda x,y: x and isinstance(y,float|int|str),value,True):
                raise ValueError(f"Field '{key}' must be a list of float")
            if len(value) < l:
                raise ValueError(f"All array field must have the same length as the time field")
        return data

class JsonTimeseriesResult(BaseModel):
    result:JsonTimeseries
    

class TableRow(BaseModel):
    ts: int = Field(
        ...,
        description="Timestamp of given measurement in unix timestamp format"
    )
    
    value: float = Field(
        ...,
        description="Measured value"
    )
    
    profile_type: str = Field(
        ...,
        description="What the measured value represents (e.g active power)"
    )
    
    power_type: str = Field(
        ...,
        description="Active or reactive, not strict, can contain active or reactive as substring"
    )
    
    model_config = {
        "extra": "allow",
        "model_show_config":False,
        "json_schema_extra": {
            "example": {
                "ts":1764627480,
                "value":0.1,
                "power_type":"active",
                "profile_type":"SOME_LINE_COMPONENT",
                "bus":"SOME_BUS_NAME ( all extra fields are used as a label )"
            }
        }
    }

class ListResult(BaseModel):
    lst:List[str]=Field(
        description="String list result."
    )
    model_config = {
        "model_show_config":False,
        "json_schema_extra": {
            "example": {
                "lst":[
                    "cim-data-1",
                    "cim-data-2"
                ]
            }
        }
    }

class UploadFileResult(BaseModel):
    filename: str=Field(
        description="Named resource result: filename, simulation name, profile/result name"
    )
    
    model_config = {
        "model_show_config":False,
        "json_schema_extra": {
            "example": {
                "filename":"sim-run-1"
            }
        }
    }

class params:
    name: str = os.urandom(6).hex()
    freq: int
    duration: int
    timestep: float
    opf: bool
    use_profile:Optional[str] = None
    replace_map:Optional[dict[str,str]] = None
    use_xml:str = None
    domain:str
    solver:str
    def __init__(self):
        pass
    
class SimParameters(BaseModel):
    name: str = Field(
        default=os.urandom(6).hex(),
        description="Name of the simulation/produced result file"
    )
    
    freq: int= Field(
        default=50,
        description="Frequency of power grid"
    )
    
    duration: int= Field(
        default=300,
        description="Duration of simulation in timesteps"
    )
    
    timestep: float= Field(
        default=1,
        description="Timestep of simulation"
    )
    
    opf: bool= Field(
        default=False,
        description="Generate a profile from a pandapower optimal powerflow"
    )
    
    use_profile:Optional[str]= Field(
        default=None,
        description="Use uploaded profile data, by keyword"
    )
    
    replace_map:Optional[dict[str,str]] = Field(
        default=None,
        description="Replace component name parts to reconcile profiles and simulation"
    )
    
    use_xml:str = Field(
        default=None,
        description="CIM data to describe simulated system, by keyword"
    )
    
    domain:str = Field(
        default='SP',
        description="Domain of simulation"
    )
    solver:str = Field(
        default='NRP',
        description="Simulation solver type"
    )
    model_config = {
        "model_show_config":False,
        "json_schema_extra": {
            "example": {
                "name":"sim-run-1",
                "freq":50,
                "duration":300,
                "timestep":1,
                "opf":False,
                "replace_map":{
                    "sym":"machine"
                },
                "use_xml":"cim-data-1",
                "domain":"SP",
                "solver":"NRP"
            }
        }
    }
