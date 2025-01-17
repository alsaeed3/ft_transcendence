document.getElementById('fetchData').addEventListener('click', fetchData);

async function fetchData() {
	try {
		const response = await fetch('http://localhost:80/api/oauth/login');
		const data = await response.json();
		displayData(data);
	} catch (error) {
		console.error('Error fetching data:', error);
	}
}

function displayData(data) {
	const contentDiv = document.getElementById('content');
	contentDiv.innerHTML = '';

	if (Array.isArray(data) && data.length > 0) {
		data.forEach(item => {
			const itemElement = document.createElement('div');
			itemElement.className = 'card mb-3';
			itemElement.innerHTML = `
				<div class="card-body">
					<h5 class="card-title">${item.title}</h5>
					<p class="card-text">${item.description}</p>
				</div>
			`;
			contentDiv.appendChild(itemElement);
		});
	} else {
		contentDiv.innerHTML = `<p>${data.message}</p>`;
	}
}