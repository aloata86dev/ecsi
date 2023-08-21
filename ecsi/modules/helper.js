export function $(selector, context = document) {
    const nodes = context.querySelectorAll(selector);
    return nodes.length === 1 ? nodes[0] : nodes;
}

export function serializeForm(form) {
    let formData = {};

    [...form.elements].forEach(element => {
        if (element.name) {
            if (element.type === 'checkbox') {
                formData[element.name] = element.checked;
            } else if (element.type !== 'button') {
                formData[element.name] = element.value;
            }
        }
    });

    return formData;
}

export function deserializeForm(form, formData) {
    Object.keys(formData).forEach(key => {
        const element = form.elements[key];
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = formData[key];
            } else if (element.type !== 'button') {
                element.value = formData[key];
            }

            element.dispatchEvent(new Event('input', { 'bubbles': true }));

            element.dispatchEvent(new Event('change', { 'bubbles': true }));
        }
    });
}

export const downloadBuffer = (filename, content) => {
    var blob = new Blob([content], { type: "text/plain;charset=utf-8" });

    var a = document.createElement("a");
    a.style.display = "none";
    document.body.appendChild(a);

    a.href = URL.createObjectURL(blob);
    a.download = filename;

    a.click();

    document.body.removeChild(a);
}