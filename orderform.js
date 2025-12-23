// Basic configuration
const CONFIG = {
    // Webhook URL provided by user
    WEBHOOK_URL: 'https://dtt1z7t3.rcsrv.com/webhook/liderorder'
};

let selectedPackageId = 3; // Default

function selectPackage(id) {
    selectedPackageId = id;

    // 1. Remove selected state from all packages
    document.querySelectorAll('.package').forEach(pkg => {
        pkg.classList.remove('selected');

        // Reset radio button
        const radio = pkg.querySelector('.radio-circle');
        if (radio) radio.classList.remove('selected');

        // Reset buttons
        const btnSelect = pkg.querySelector('.btn-select');
        const btnActive = pkg.querySelector('.btn-active');

        if (btnSelect) btnSelect.style.display = 'block';
        if (btnActive) btnActive.style.display = 'none';
    });

    // 2. Add selected state to clicked package
    const selectedPkg = document.getElementById(`package-${id}`);
    if (selectedPkg) {
        selectedPkg.classList.add('selected');

        // Initial radio
        const radio = selectedPkg.querySelector('.radio-circle');
        if (radio) radio.classList.add('selected');

        // Toggle buttons
        const btnSelect = selectedPkg.querySelector('.btn-select');
        const btnActive = selectedPkg.querySelector('.btn-active');

        if (btnSelect) btnSelect.style.display = 'none';
        if (btnActive) btnActive.style.display = 'block';

        // 3. Update Warning Count (Random new number)
        updateStockCount();

        // 4. Update Order Form Size Selector
        const itemCount = parseInt(selectedPkg.getAttribute('data-items'));
        renderSizeSelectors(itemCount);

        // 5. Smooth scroll to form section
        setTimeout(() => {
            const formContainer = document.querySelector('.order-form-container');
            if (formContainer) {
                formContainer.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }, 300); // Small delay to ensure size selectors are rendered
    }
}

function updateStockCount() {
    // Generates random number between 94 and 213 (inclusive)
    const min = 94;
    const max = 213;
    const count = Math.floor(Math.random() * (max - min + 1) + min);

    const countElement = document.getElementById('sold-count');
    if (countElement) {
        // Simple animation effect
        countElement.style.opacity = 0;
        setTimeout(() => {
            countElement.innerText = count;
            countElement.style.opacity = 1;
        }, 200);
    }
}

function renderSizeSelectors(count) {
    const container = document.getElementById('size-selectors-container');
    if (!container) return;

    container.innerHTML = ''; // Clear existing

    // Toggle grid layout class if count > 1
    if (count > 1) {
        container.classList.add('grid-layout');
    } else {
        container.classList.remove('grid-layout');
    }

    for (let i = 1; i <= count; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'size-selector-group';

        const label = document.createElement('label');
        label.className = 'size-label';
        label.innerText = `${i}. Çift İçin Beden Seçiniz*`;

        const select = document.createElement('select');
        select.name = `size_${i}`;
        select.required = true;

        const options = [
            { val: '', text: 'Beden Seçiniz' },
            { val: '32-34', text: '32 - 34' },
            { val: '35-37', text: '35 - 37' },
            { val: '38-40', text: '38 - 40' },
            { val: '41-43', text: '41 - 43' },
            { val: '44-46', text: '44 - 46' }
        ];

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.val;
            option.innerText = opt.text;
            if (opt.val === '') option.disabled = true;
            if (opt.val === '') option.selected = true;
            select.appendChild(option);
        });

        wrapper.appendChild(label);
        wrapper.appendChild(select);
        container.appendChild(wrapper);
    }
}

// Phone formatting logic
const phoneInput = document.getElementById('phone');
if (phoneInput) {
    phoneInput.addEventListener('input', function (e) {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,4})(\d{0,3})(\d{0,2})(\d{0,2})/);
        e.target.value = !x[2] ? x[1] : x[1] + ' ' + x[2] + (x[3] ? ' ' + x[3] : '') + (x[4] ? ' ' + x[4] : '');
    });
}

// Track AddPaymentInfo on first interaction with form
const formInputs = document.querySelectorAll('#orderForm input, #orderForm textarea');
let hastrackedAddPaymentInfo = false;
formInputs.forEach(input => {
    input.addEventListener('focus', () => {
        if (!hastrackedAddPaymentInfo && typeof fbq === 'function') {
            fbq('track', 'AddPaymentInfo');
            hastrackedAddPaymentInfo = true;
        }
    });
});

// Form Submission
const orderForm = document.getElementById('orderForm');
if (orderForm) {
    orderForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const submitBtn = document.querySelector('.btn-submit');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'İşleniyor...';
        submitBtn.disabled = true;

        // Gather Data
        const formData = new FormData(orderForm);
        const data = Object.fromEntries(formData.entries());

        // Add minimal metadata
        data.package_id = selectedPackageId;
        data.timestamp = new Date().toISOString();

        // 1. Save User Data (Advanced Matching) & Order Details for Summary
        const userData = {
            fn: data.name, // first name
            ln: data.surname, // last name
            ph: data.phone.replace(/\s/g, ''), // phone normalized
            ct: data.city, // city
            country: 'tr', // hardcoded assuming TR
            ad: data.address // address for summary
        };

        const orderDetails = {
            value: 0,
            currency: 'TRY',
            content_ids: [`package_${selectedPackageId}`],
            content_type: 'product',
            shipping_cost: 0
        };

        // Price Logic
        if (selectedPackageId == 1) {
            orderDetails.value = 549 + 60;
            orderDetails.shipping_cost = 60;
        }
        else if (selectedPackageId == 2) {
            orderDetails.value = 869;
        }
        else if (selectedPackageId == 3) {
            orderDetails.value = 1499;
        }

        // Generate unique event_id for Meta Pixel deduplication
        const eventId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        orderDetails.event_id = eventId;

        localStorage.setItem('pixel_user_data', JSON.stringify(userData));
        localStorage.setItem('pixel_order_data', JSON.stringify(orderDetails));
        localStorage.setItem('pixel_event_sent', 'false'); // Flag to track if event was sent

        try {
            // Check for ENV variable if available
            const webhook = window.env?.WEBHOOK_URL || CONFIG.WEBHOOK_URL;
            console.log('Attemping webhook submission to:', webhook);

            // Standard FETCH (JSON)
            await fetch(webhook, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            console.log('Webhook success.');
            window.location.href = 'success.html';

        } catch (error) {
            console.error('Submission Error:', error);
            // Fallback to success page
            window.location.href = 'success.html';
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Initialize default state (Pack 3 selected as per HTML default)
document.addEventListener('DOMContentLoaded', () => {
    // Ensure the visual state matches the static HTML default
    selectPackage(3);
});
