let dashboardConfig = {};

async function loadConfig() {
    const res = await fetch('/config');
    dashboardConfig = await res.json();
}

async function loadIsoList() {
    try {
        const response = await fetch(`/api/post`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({ method: 'get_img_tree' })
        });
        const data = await response.json();
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
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    loadIsoList();
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
    iframe.src = `/proxy/eiso/id/${id}/`;
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
    const port = dashboardConfig.IVENTOY_WEB_PORT || 16000;
    downloadLink.href = `http://${window.location.hostname}:${port}/riso/id/${id}.iso`;
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
