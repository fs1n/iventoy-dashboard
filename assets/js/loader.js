document.addEventListener("DOMContentLoaded", function() {
    fetch(`http://${window.location.hostname}/api/post`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ method: 'get_img_tree' })
    })
    .then(response => response.json())
    .then(data => {
        const container = document.querySelector('#iso-list');
        const table = document.createElement('table');
        table.classList.add('table', 'table-striped', 'table-hover');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Icon</th>
                    <th>Name</th>
                    <th>Actions</th>
                    <th>Info</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = table.querySelector('tbody');
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><i class="fa-solid fa-compact-disc fa-2xl"></i></td>
                <td>${item.name}</td>
                <td>
                    <button class="btn btn-primary" onclick="viewISO(${item.imgid})">View</button>
                    <button class="btn btn-secondary" onclick="downloadISO(${item.imgid}, '${item.pmd5}')">Download</button>
                </td>
                <td>
                    <i class="fa-solid fa-circle-info fa-2xl" onmouseover="showInfo(${item.imgid})"></i>
                </td>
            `;
            tbody.appendChild(row);
        });
        container.appendChild(table);
    })
    .catch(error => {
        const container = document.querySelector('#iso-list');
        container.innerHTML = `<div class="alert alert-danger">Failed to load ISO data: ${error.message}</div>`;
        console.error('Error fetching data:', error);
    });

    const uploadForm = document.querySelector('#upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const fileInput = document.querySelector('#isoFile');
            const status = document.querySelector('#upload-status');
            if (!fileInput.files.length) {
                status.innerHTML = '<div class="alert alert-warning">Please select a file</div>';
                return;
            }
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            fetch(`http://${window.location.hostname}/api/upload`, {
                method: 'POST',
                body: formData
            })
            .then(r => {
                if (!r.ok) throw new Error('Upload failed');
                return r.text();
            })
            .then(() => {
                status.innerHTML = '<div class="alert alert-success">Upload successful</div>';
            })
            .catch(err => {
                status.innerHTML = `<div class="alert alert-danger">Upload failed: ${err.message}</div>`;
            });
        });
    }
});

function viewISO(id) {
    const iframeViewer = document.querySelector('#iframe-viewer');
    iframeViewer.innerHTML = ''; // Clear previous iframe

    // Create close button
    const closeButton = document.createElement('i');
    closeButton.classList.add('fa-solid', 'fa-xmark', 'fa-2xl', 'close-button');
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => {
        iframeViewer.innerHTML = ''; // Clear iframe when close button is clicked
    };

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = `http://${window.location.hostname}:16000/eiso/id/${id}/`;
    iframe.width = '100%';
    iframe.height = '500px';

    // Append close button and iframe to iframe viewer
    iframeViewer.appendChild(closeButton);
    iframeViewer.appendChild(iframe);

    // Scroll down to the iframe
    iframeViewer.scrollIntoView({ behavior: 'smooth' });
}

function downloadISO(id, pmd5) {
    const downloadLink = document.createElement('a');
    downloadLink.href = `http://${window.location.hostname}:16000/riso/id/${id}.iso`;
    downloadLink.download = `${id}.iso`;
    downloadLink.click();
}

const infoCache = {};

function showInfo(id) {
    if (infoCache[id]) {
        displayPopover(infoCache[id], id);
    } else {
        fetch(`http://${window.location.hostname}/api/post`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({ method: 'get_img_info', id: id })
        })
        .then(response => response.json())
        .then(data => {
            infoCache[id] = data;
            displayPopover(data, id);
        })
        .catch(error => console.error('Error fetching info:', error));
    }
}

function displayPopover(data, id) {
    const infoIcon = document.querySelector(`i[onmouseover="showInfo(${id})"]`);
    const humanReadableSize = (size) => {
        const i = Math.floor(Math.log(size) / Math.log(1024));
        return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
    };
    const popoverContent = `
        <p><strong>Size:</strong> ${humanReadableSize(data.size)}</p>
        <p><strong>PMD5:</strong> ${data.pmd5}</p>
        <p><strong>OS:</strong> ${data.os}</p>
    `;

    // Hide any existing popovers
    $('.popover').popover('hide');

    $(infoIcon).popover({
        content: popoverContent,
        html: true,
        placement: 'left',
        trigger: 'manual'
    }).popover('show');

    const popover = document.querySelector('.popover');
    popover.addEventListener('mouseleave', () => {
        setTimeout(() => {
            if (!popover.matches(':hover')) {
                $(infoIcon).popover('hide');
            }
        }, 3000);
    });

    popover.addEventListener('mouseenter', () => {
        clearTimeout(popover.hideTimeout);
    });

    popover.hideTimeout = setTimeout(() => {
        if (!popover.matches(':hover')) {
            $(infoIcon).popover('hide');
        }
    }, 3000);
}
