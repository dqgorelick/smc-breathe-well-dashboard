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

