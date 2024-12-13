export function Form(playerCount) {
    const form = document.createElement('form');
    form.id = 'playerForm';
    form.className = 'needs-validation';
    form.noValidate = true;

    for (let i = 1; i <= playerCount; i++) {
        const div = document.createElement('div');
        div.className = 'mb-3';

        const label = document.createElement('label');
        label.htmlFor = `player${i}`;
        label.className = 'form-label';
        label.textContent = `Player ${i}`;
        label.setAttribute('data-i18n', `form.playerLabel${i}`); // i18n key for the label


        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control';
        input.id = `player${i}`;
        input.placeholder = `Enter name of player ${i}`;
        input.required = true;
        input.setAttribute('data-i18n', `form.playerPlaceholder${i}`); // i18n key for the placeholder


        div.appendChild(label);
        div.appendChild(input);
        form.appendChild(div);
    }

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = 'Submit';
    submitBtn.setAttribute('data-i18n', 'form.submitButton'); // i18n key for the submit button

    form.appendChild(submitBtn);

    return form;
}
