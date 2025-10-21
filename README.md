# DPSIM-CRETE-VALLEY
### How to use dps-server with pre/post processing
This repo includes examples on how to prepare data for this specific use case, how to post process results and an example of a web interface to interact
with dpsim server.
# DPS-SERVER
A demonstration on how to use dps-server is in [this repo](https://github.com/SystemsPurge/dps-server).<br>

# PROCESSING
`docker compose up` will serve dpsim server on port 5000
The particularities of the project include:
1. Providing power profile data for powerflow
2. Providing scenario dependant power factors for different generator type
3. Providing a post simulation rating to calculate transformer/line rated loading, and bus power/voltage<br>

These intell the basic usage of dpsim in terms of system/profile-data provision, but requires post and pre processing steps as implemented
In the index of the project.<br>
To provide the file structure of your data, and run the demo in this project, create a .env file in the root of the peri-processing project
And add the proper filepaths, scenarios...etc.<br>
Env variables are :
- ps=profile data file
- fs=factors data file
- scenario=scenario number in factors file
- xml=system data folder ( CIM FORMAT )
- lines=line ratings data file path
- trafos=transformer ratings data file path
- busses=bus ratings data file path<br>
Env file should have each variable in a seperate line , in the format `key=value`.<br>
Once everything is configured you can run `npm run demo`, has been built using node 23.1 and npm 10.9

# MINIMAL-GUI
`docker compose up` will serve the website on port 3000 ( change port in package.json script and compose.yaml if necessary).
Website allows uploading xml files, running sims and visualizing subsets of results.