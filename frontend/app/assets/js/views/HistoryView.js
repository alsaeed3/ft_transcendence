export function HistoryView() {
    const section = document.createElement("section");
    section.id = "history-view";
    section.className = "container py-5";

    // Set up the initial content
    section.innerHTML = `
        <div id="tournament-list" class="row g-4"></div>
    `;

    // Fetch and render tournament data
    return section;
}

