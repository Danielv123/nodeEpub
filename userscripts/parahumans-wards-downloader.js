// ==UserScript==
// @name         Parahumans Ward Downlodaer
// @namespace    Danielv123
// @version      1.0
// @description  Userscript for downloading Ward as an epub ebook
// @author       You
// @match        *w.parahumans.net/*
// @icon         https://www.google.com/s2/favicons?domain=undefined.
// @grant       GM_xmlhttpRequest
// ==/UserScript==

console.log("DOM fully loaded and parsed");

// $('#content_wrapper_inner > span:nth-child(7)').append('<button id="getEbook" class="btn" type="BUTTON">ebook</button>');
async function getChapter() {
    // .entry-content
    // .entry-title
}
async function downloadEbook() {
    const config = {
        ebookServer: "http://ebook.danielv.no:5001",
        // ebookServer: "http://localhost",
    };
    let data = {
        ebookMethod: "links",
        title: document.querySelector("#profile_top > b")?.innerHTML || "Ward",
        author: [document.querySelector("#profile_top > a")?.innerHTML || "Whildbow"],
        description: document.querySelector("#profile_top > div")?.innerHTML,
        publisher: "Ebook by danielv@danielv.no",
        contents: [],
        bookID: "Ward"
    }
    let chapterLinks = []
    document.querySelectorAll("#nav_menu-5 .sub-menu > .menu-item > a").forEach(item => chapterLinks.push(item))
    document.querySelectorAll("#nav_menu-6 .sub-menu > .menu-item > a").forEach(item => chapterLinks.push(item))
    chapterLinks = chapterLinks.map(x => {
        return {
            url: x.href,
            title: x.innerHTML,
        }
    })
    // console.log(chapterLinks) // Array of {url: clean url, title: "16.3"}
    chapterLinks.forEach(chapter => {
        data.contents[data.contents.length] = {
            url: chapter.url,
            dataSelector: ".entry-content",
            title: chapter.title,
        };
    })
    console.log(data);

    // Send to ebook server
    // let resp = await fetch(config.ebookServer + "/epubify", {
    //     method: "POST",
    //     headers: {
    //         "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify(data)
    // })
    // let responseData = (await resp.json()).data
    // console.log(responseData)
    GM_xmlhttpRequest({
        method: "POST",
        url: config.ebookServer + "/epubify",
        data: JSON.stringify(data),
        headers: {
            "Content-Type": "application/json"
        },
        onload: function (response) {
            console.log(response.responseText + " book is done");
            if (response.responseText == "success") {
                location.href = config.ebookServer + "/" + document.location.pathname.substr(3, 8).replace("/", "") + ".epub";
            } else {
                alert("Could not contact ebook server. Please alert author.");
            }
            document.getElementById('topSuprSecret').outerHTML = '';
        }
    });
}
