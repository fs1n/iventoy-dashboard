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

            const iconCell = document.createElement('td');
            iconCell.innerHTML = '<i class="fa-solid fa-compact-disc fa-2xl"></i>';
            row.appendChild(iconCell);

            const nameCell = document.createElement('td');
            nameCell.textContent = item.name;
            row.appendChild(nameCell);

            const actionsCell = document.createElement('td');
            actionsCell.innerHTML = `
                    <button class="btn btn-primary" onclick="viewISO(${item.imgid})">View</button>
                    <button class="btn btn-secondary" onclick="downloadISO(${item.imgid}, '${item.pmd5}')">Download</button>`;
            row.appendChild(actionsCell);

            const infoCell = document.createElement('td');
            infoCell.innerHTML = `<i class="fa-solid fa-circle-info fa-2xl" onmouseover="showInfo(${item.imgid})"></i>`;
            row.appendChild(infoCell);

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
    iframeViewer.innerHTML = ''; // Clear previous content

    // Create the new ISO browser container
    const browserContainer = document.createElement('div');
    browserContainer.className = 'iso-browser mt-4';
    browserContainer.innerHTML = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">
                    <i class="fa-solid fa-folder-open me-2"></i>
                    ISO Browser - ID: ${id}
                </h5>
                <button class="btn btn-sm btn-outline-secondary" onclick="closeISOBrowser()">
                    <i class="fa-solid fa-xmark"></i> Close
                </button>
            </div>
            <div class="card-body">
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb" id="iso-breadcrumb">
                        <li class="breadcrumb-item"><a href="#" onclick="browseISO(${id}, '')">Root</a></li>
                    </ol>
                </nav>
                <div id="iso-loading" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading ISO contents...</p>
                </div>
                <div id="iso-contents" style="display: none;">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th width="50"><i class="fa-solid fa-file"></i></th>
                                <th>Name</th>
                                <th width="120">Size</th>
                                <th width="150">Modified</th>
                                <th width="100">Action</th>
                            </tr>
                        </thead>
                        <tbody id="iso-file-list">
                        </tbody>
                    </table>
                </div>
                <div id="iso-error" class="alert alert-danger" style="display: none;">
                    <i class="fa-solid fa-exclamation-triangle me-2"></i>
                    <span id="iso-error-message"></span>
                </div>
            </div>
        </div>
    `;

    iframeViewer.appendChild(browserContainer);
    
    // Load initial content
    browseISO(id, '');
    
    // Scroll to viewer
    iframeViewer.scrollIntoView({ behavior: 'smooth' });
}

async function browseISO(id, path) {
    const loadingDiv = document.getElementById('iso-loading');
    const contentsDiv = document.getElementById('iso-contents');
    const errorDiv = document.getElementById('iso-error');
    const fileList = document.getElementById('iso-file-list');
    
    // Normalize path
    path = path || '';
    if (path && !path.endsWith('/')) {
        path += '/';
    }
    
    // Show loading, hide others
    loadingDiv.style.display = 'block';
    contentsDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    
    try {
        const response = await fetch(`/api/iso/${id}/browse?path=${encodeURIComponent(path)}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Update breadcrumb
        updateBreadcrumb(id, data.currentPath);
        
        // Clear and populate file list
        fileList.innerHTML = '';
        
        data.items.forEach(item => {
            const row = document.createElement('tr');
            
            // Icon column
            const iconCell = document.createElement('td');
            const icon = item.isDirectory ? 
                '<i class="fa-solid fa-folder text-warning"></i>' : 
                '<i class="fa-solid fa-file text-primary"></i>';
            iconCell.innerHTML = icon;
            row.appendChild(iconCell);
            
            // Name column
            const nameCell = document.createElement('td');
            if (item.isDirectory) {
                let newPath;
                if (item.name === '..') {
                    // Go up one directory
                    const pathParts = data.currentPath.split('/').filter(p => p);
                    pathParts.pop();
                    newPath = pathParts.join('/');
                } else {
                    // Go into subdirectory
                    newPath = data.currentPath + item.href;
                }
                nameCell.innerHTML = `<a href="#" onclick="browseISO(${id}, '${newPath}')" class="text-decoration-none">${item.name}</a>`;
            } else {
                nameCell.textContent = item.name;
            }
            row.appendChild(nameCell);
            
            // Size column
            const sizeCell = document.createElement('td');
            sizeCell.textContent = item.size || '-';
            row.appendChild(sizeCell);
            
            // Modified column
            const modifiedCell = document.createElement('td');
            modifiedCell.textContent = item.modified || '-';
            row.appendChild(modifiedCell);
            
            // Action column
            const actionCell = document.createElement('td');
            if (!item.isDirectory && item.name !== '..') {
                const filePath = data.currentPath + item.href;
                actionCell.innerHTML = `
                    <button class="btn btn-sm btn-success" onclick="downloadFileFromISO(${id}, '${filePath}', '${escapeQuotes(item.name)}')" title="Download">
                        <i class="fa-solid fa-download"></i>
                    </button>
                `;
            }
            row.appendChild(actionCell);
            
            fileList.appendChild(row);
        });
        
        // Show contents, hide loading
        loadingDiv.style.display = 'none';
        contentsDiv.style.display = 'block';
        
    } catch (error) {
        console.error('Error browsing ISO:', error);
        
        // Show error
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        document.getElementById('iso-error-message').textContent = 
            `Failed to load ISO contents: ${error.message}`;
    }
}

function escapeQuotes(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function updateBreadcrumb(id, currentPath) {
    const breadcrumb = document.getElementById('iso-breadcrumb');
    breadcrumb.innerHTML = '<li class="breadcrumb-item"><a href="#" onclick="browseISO(' + id + ', \'\')">Root</a></li>';
    
    if (currentPath) {
        const pathParts = currentPath.split('/').filter(part => part);
        let accumulatedPath = '';
        
        pathParts.forEach((part, index) => {
            accumulatedPath += part + '/';
            const isLast = index === pathParts.length - 1;
            
            if (isLast) {
                breadcrumb.innerHTML += `<li class="breadcrumb-item active" aria-current="page">${part}</li>`;
            } else {
                breadcrumb.innerHTML += `<li class="breadcrumb-item"><a href="#" onclick="browseISO(${id}, '${accumulatedPath}')">${part}</a></li>`;
            }
        });
    }
}

function downloadFileFromISO(id, filePath, fileName) {
    // Create a temporary download link
    const downloadLink = document.createElement('a');
    downloadLink.href = `/api/iso/${id}/download?path=${encodeURIComponent(filePath)}`;
    downloadLink.download = fileName;
    downloadLink.style.display = 'none';
    
    // Add to DOM, click, and remove
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Show feedback
    const toast = document.createElement('div');
    toast.className = 'toast position-fixed top-0 end-0 m-3';
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="toast-header">
            <i class="fa-solid fa-download text-success me-2"></i>
            <strong class="me-auto">Download</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">
            Downloading ${fileName}...
        </div>
    `;
    
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        document.body.removeChild(toast);
    });
}

function closeISOBrowser() {
    const iframeViewer = document.querySelector('#iframe-viewer');
    iframeViewer.innerHTML = '';
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
        fetch(`/api/post`, {
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

if (typeof module !== 'undefined') {
    module.exports = { loadIsoList };
}
