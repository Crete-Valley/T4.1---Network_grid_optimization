# DPSIM-CRETE-VALLEY
### How to use dps-server with pre/post processing
This repo includes examples on how to prepare data for this specific use case, how to post process results and an example of a web interface to interact
with dpsim server.<br>
# DPS-SERVER
A demonstration on how to use dps-server is in [this repo](https://git.rwth-aachen.de/acs/public/dpsv).<br>
# Demo
`docker compose up` on `docker/compose.yaml` will serve the website on port 3000 ( change port in package.json script and compose.yaml if necessary)
and backend on port 5000.<br>
Website allows uploading xml files, running sims and visualizing subsets of results.<br>
The particularities of the project include:
1. Providing power profile data for powerflow
2. Providing scenario dependant power factors for different generator type
3. Providing a post simulation rating to calculate transformer/line rated loading, and bus power/voltage

These intell the basic usage of dpsim in terms of system/profile-data provision, but requires post and pre processing steps.<br>
Once everything is configured you can run `npm run start`, has been built using node 23.1 and npm 10.9

# Development
Use `compose-dev.yaml` for dps-server development. Hot reload is not activated, but the uvicorn flags of the dps-server
service command can be changed to do so: `--reload`.<br>
This require to recurse submodules on pull.<br>
