customElements.define('mega-storage', Storage);
var Buffer = buffer.Buffer;
var storage = new mega.Storage({
    email: 'admin@pearwoods.com',
    password: 'g00seberry',
    userAgent: 'ExampleApplication/1.0'
})
var yearFolders = [], selectedYearFolder = null;
storage.once('ready', () => {
    alert("Mega: Logged in");
    $("#upload").show();
    yearFolders = storage.root.children.filter(f => f.directory === true);
    yearFolders.forEach(f => {
        if (f.name === '2024') {
            $("#rootFolders").append("<option value='" + f.nodeId + "' selected>" + f.name + "</option>");
        } else {
            $("#rootFolders").append("<option value='" + f.nodeId + "'>" + f.name + "</option>");
        }
    });
    selectedYearFolder = yearFolders.filter(f => f.name === '2024')[0];
})

storage.once('error', error => {
    alert("Mega: Login error");
})

let selectedVersion = 'latest'
function changeVersion(event) {
    document.querySelector("#version").innerHTML = 'loading...';
    const script = document.createElement('script');
    selectedVersion = event.srcElement.value
    script.src = "https://cdn.jsdelivr.net/npm/browser-image-compression@" + selectedVersion + "/dist/browser-image-compression.js";
    document.body.appendChild(script);
    script.addEventListener('load', () => {
        document.querySelector("#version").innerHTML = imageCompression.version;
    });
}

function changeYearFolder(event) {
    selectedYearFolder = yearFolders.find(f => f.nodeId === event.srcElement.value);
}

var controller;
document.querySelector("#version").innerHTML = imageCompression.version;
function compressImage(useWebWorker, file, meta) {
    var logDom, progressDom;
    if (useWebWorker) {
        logDom = document.querySelector("#web-worker-log");
        progressDom = document.querySelector("#web-worker-progress");
    } else {
        logDom = document.querySelector("#main-thread-log");
        progressDom = document.querySelector("#main-thread-progress");
    }
    // document.getElementById("preview").src = URL.createObjectURL(file);

    logDom.innerHTML =
        "Source image size:" + (file.size / 1024 / 1024).toFixed(2) + "mb";
    console.log("input", file);
    //   imageCompression.copyExifWithoutOrientation(file).then(function (o) {
    //     console.log("ExifOrientation", o);
    //   });

    controller = typeof AbortController !== 'undefined' && new AbortController();

    var options = {
        maxSizeMB: parseFloat(document.querySelector("#maxSizeKB").value / 1024),
        useWebWorker: useWebWorker,
        onProgress: onProgress,
        preserveExif: true,
        libURL: "https://cdn.jsdelivr.net/npm/browser-image-compression@" + selectedVersion + "/dist/browser-image-compression.js"
    };
    if (controller) {
        options.signal = controller.signal;
    }
    //   return uploadToServer(output, file.name, meta.CreateDate.getTime());
    const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];
    imageCompression(file, options)
        .then(function (output) {
            logDom.innerHTML +=
                "<br>* " + file.name + ": output size:" + (output.size / 1024 / 1024).toFixed(2) + "mb";
            console.log("output", output);
            const downloadLink = URL.createObjectURL(output);
            logDom.innerHTML +=
                '&nbsp;<a href="' +
                downloadLink +
                '" download="' +
                file.name +
                '">Compressed image</a>';
            // document.getElementById('preview-after-compress').src = downloadLink
            const cd = meta.CreateDate || meta.DateTimeOriginal || meta.DateTimeDigitized || meta.DateTime;
            const name = cd.getFullYear() + "-" + months[cd.getMonth()] + "-" + cd.getDate() + "-" + cd.getHours() + "-" + cd.getMinutes();
            return uploadToServer(output, name+".jpg", cd.getTime());
        })
        .catch(function (error) {
            alert(error.message);
        });

    function onProgress(p) {
        console.log("onProgress", p);
        progressDom.innerHTML = "(" + p + "%" + ")";
    }
}

function compressImages(event, useWebWorker) {
    var files = event.target.files;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        exifr.parse(file).then(function (output) {
            console.log(output);
            compressImage(useWebWorker, file, output);
        })
    }

}
function abort() {
    if (!controller) return
    controller.abort(new Error('I just want to stop'));
}

function uploadToServer(file, name, ts) {
    const reader = new FileReader();

    // This fires after the blob has been read/loaded.
    reader.addEventListener('loadend', (e) => {
        const result = e.srcElement.result;

        const ufile = selectedYearFolder.upload({
            name: name, allowUploadBuffering: true, size: file.size,
            timestamp: ts
        }, Buffer.from(result)).complete
        console.log("uploaded");
        $("#upload-log").html($("#upload-log").html() + "<br>Uploaded " + name + " to Mega.");
    });

    // Start reading the blob as text.
    reader.readAsArrayBuffer(file);


}
