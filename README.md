# BreatheWell St Mary's

Website and AWS infrastructure code for St Mary's County Health Department Air Quality dashboard

Current dashboard is live here: [smchd.org/breathewell](http://smchd.org/breathewell/)

## Getting started 

The codebase is split up into the frontend (iFrame) and the backend services. To accomplish aggregating the data, there is a AWS [serverless](https://www.serverless.com/framework/docs/providers/aws/) project. 

#### Setting up front-end 

Run `python -m SimpleHTTPServer 3000` and view the code at localhost:3000


#### Setting up backend

Backend code lives in the services file directory. 

## Deploying 

#### Deploying to frontend

This uses github pages! Merging into main will deploy the frontend code

#### Deploying backend 

deploying to dev: 

`sls deploy --verbose --stage dev` 

deploying to prod: 

`sls deploy --verbose --stage prod` 


#### Notes 

Deployments go here: https://danielgorelick.com/smc-breathe-well-dashboard/ 
Deployment is loaded as iframe here: https://smchd.org/breathewell/ 

s3 bucket prod: smchd-breathewell-dashboard-prod (public)
s3 bucket dev: smchd-breathewell-dashboard-dev (public)
s3 bucket trailer data: breathewell-trailer-sensor-data (not public)

**Relevent accounts**

MapBox dev account 

Testing dev: 

1. deploy `sls deploy function --verbose --function updateLatest --stage dev` 
2. run function `sls invoke -f updateLatest --stage dev` 
3. if successful, look for updated JSON in [smchd-breathewell-dashboard-dev](https://smchd-breathewell-dashboard-dev.s3.amazonaws.com/latest.json)
4. test viewing dev endpoint in frontend, by appending `?dev=true` to the endpoint





