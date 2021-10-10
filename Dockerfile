FROM node:latest
RUN apt-get update &&  mkdir /nodeEpub
WORKDIR /nodeEpub
COPY . .
RUN apt-get install libfontconfig
RUN npm i
EXPOSE 80
CMD ["npm", "start"]

# sudo docker build -t nodeepub --no-cache --force-rm nodeEpub
# sudo docker run -d --name nodeEpub -p 80:80 nodeepub
# -p outsidePort:insidePort
