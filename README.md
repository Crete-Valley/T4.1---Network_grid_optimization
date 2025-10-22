# DPSIM-CRETE-VALLEY
### How to use dps-server with pre/post processing
This repo includes examples on how to prepare data for this specific use case, how to post process results and an example of a web interface to interact
with dpsim server.
# DPS-SERVER
A demonstration on how to use dps-server is in [this repo](https://github.com/SystemsPurge/dps-server).<br>

# Usage
`docker compose up` will serve the website on port 3000 ( change port in package.json script and compose.yaml if necessary).<br>
Website allows uploading xml files, running sims and visualizing subsets of results.<br>
The particularities of the project include:
1. Providing power profile data for powerflow
2. Providing scenario dependant power factors for different generator type
3. Providing a post simulation rating to calculate transformer/line rated loading, and bus power/voltage<br>

These intell the basic usage of dpsim in terms of system/profile-data provision, but requires post and pre processing steps.<br>
Once everything is configured you can run `npm run demo`, has been built using node 23.1 and npm 10.9
