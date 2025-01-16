document.getElementById('fetchData').addEventListener('click', fetchData);

async function fetchData() {
	try {
		const response = await fetch('http://localhost:8000/api/data');
		const data = await response.json();
		displayData(data);
	} catch (error) {
		console.error('Error fetching data:', error);
	}
}

function displayData(data) {
	const contentDiv = document.getElementById('content');
	contentDiv.innerHTML = '';

	if (Array.isArray)
}