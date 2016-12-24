nodeEpub

A webservice to be used with the [Fanfiction+](https://greasyfork.org/en/scripts/13768-fanfiction) userscript, but can also be used standalone.
It generates epub ebooks from JSON post requests. Its that simple. Download the books by doing hostname/bookID.epub

Install with git:

    git clone https://github.com/Danielv123/nodeEpub.git
    cd nodeEpub
    npm install
    npm start

Get from docker hub:

    sudo docker run -d --name nodeEpub -p 80:80 danielvestol/nodeepub

Build yourself and host with Docker: (for devs)

    git clone https://github.com/Danielv123/nodeEpub.git
    sudo docker build -t nodeepub --no-cache --force-rm nodeEpub
    sudo docker run -d --name nodeEpub -p 80:80 nodeepub

-p outsidePort:insidePort, and since the default port is 80 you want something like XX:80
