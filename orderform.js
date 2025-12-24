// Basic configuration
const CONFIG = {
    // Webhook URL provided by user
    WEBHOOK_URL: 'https://dtt1z7t3.rcsrv.com/webhook/liderorder'
};

let selectedPackageId = null; // No default selection
let selectedPaymentMethod = null; // 'cod' or 'online'
let stripe = null;
let cardElement = null;
let cardComplete = false;

// Initialize Stripe
function initializeStripe() {
    const publishableKey = import.meta?.env?.VITE_STRIPE_PUBLISHABLE_KEY;

    if (publishableKey) {
        stripe = Stripe(publishableKey);
        const elements = stripe.elements();

        // Create card element with custom styling
        cardElement = elements.create('card', {
            style: {
                base: {
                    color: '#FFFFFF',
                    fontFamily: 'Montserrat, sans-serif',
                    fontSmoothing: 'antialiased',
                    fontSize: '15px',
                    '::placeholder': {
                        color: '#64748B'
                    }
                },
                invalid: {
                    color: '#EF4444',
                    iconColor: '#EF4444'
                }
            }
        });

        // Listen for card input changes
        cardElement.on('change', function (event) {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
                cardComplete = false;
            } else {
                displayError.textContent = '';
                cardComplete = event.complete;
            }
            updateSubmitButton();
        });
    } else {
        console.warn('Stripe publishable key not found. Online payment will not be available.');
    }
}

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

        // 5. Smooth and slow scroll to form section
        setTimeout(() => {
            const formContainer = document.querySelector('.order-form-container');
            if (formContainer) {
                // Get the position
                const formPosition = formContainer.getBoundingClientRect().top + window.pageYOffset;
                const startPosition = window.pageYOffset;
                const distance = formPosition - startPosition;
                const duration = 1000; // 1 second for smooth scroll
                let start = null;

                // Easing function for smooth animation
                function easeInOutCubic(t) {
                    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
                }

                function animation(currentTime) {
                    if (start === null) start = currentTime;
                    const timeElapsed = currentTime - start;
                    const progress = Math.min(timeElapsed / duration, 1);
                    const ease = easeInOutCubic(progress);

                    window.scrollTo(0, startPosition + distance * ease);

                    if (timeElapsed < duration) {
                        requestAnimationFrame(animation);
                    }
                }

                requestAnimationFrame(animation);
            }
        }, 200);
    }

    updateSubmitButton();
}

// Make selectPackage globally accessible for HTML onclick handlers
window.selectPackage = selectPackage;

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

// Payment Method Selection
function setupPaymentMethodSelection() {
    const codOption = document.getElementById('payment-cod');
    const onlineOption = document.getElementById('payment-online');
    const stripeContainer = document.getElementById('stripe-card-container');

    if (codOption) {
        codOption.addEventListener('click', () => {
            selectedPaymentMethod = 'cod';
            codOption.classList.add('selected');
            onlineOption.classList.remove('selected');
            stripeContainer.style.display = 'none';

            // Unmount card element if it was mounted
            if (cardElement && cardElement._parent) {
                cardElement.unmount();
            }

            cardComplete = false;
            updateSubmitButton();
        });
    }

    if (onlineOption) {
        onlineOption.addEventListener('click', () => {
            if (!stripe) {
                alert('Online ödeme şu anda kullanılamıyor. Lütfen kapıda ödeme seçeneğini kullanın.');
                return;
            }

            selectedPaymentMethod = 'online';
            onlineOption.classList.add('selected');
            codOption.classList.remove('selected');
            stripeContainer.style.display = 'block';

            // Mount card element if not already mounted
            if (cardElement && !cardElement._parent) {
                cardElement.mount('#card-element');
            }

            updateSubmitButton();
        });
    }
}

// Update submit button state
function updateSubmitButton() {
    const submitBtn = document.querySelector('.btn-submit');
    if (!submitBtn) return;

    // Enable button if:
    // 1. A package is selected AND
    // 2. (COD is selected OR (Online is selected AND card is complete))
    const shouldEnable = selectedPackageId !== null &&
        (selectedPaymentMethod === 'cod' ||
            (selectedPaymentMethod === 'online' && cardComplete));

    submitBtn.disabled = !shouldEnable;
}

// Get package price
function getPackagePrice(packageId) {
    if (packageId == 1) return { total: 1059, base: 999, shipping: 60 };
    if (packageId == 2) return { total: 1559, base: 1499, shipping: 60 };
    if (packageId == 3) return { total: 1799, base: 1799, shipping: 0 };
    return { total: 0, base: 0, shipping: 0 };
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

        if (!selectedPackageId || !selectedPaymentMethod) {
            alert('Lütfen bir paket ve ödeme yöntemi seçin.');
            return;
        }

        const submitBtn = document.querySelector('.btn-submit');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'İşleniyor...';
        submitBtn.disabled = true;

        // Gather Data
        const formData = new FormData(orderForm);
        const data = Object.fromEntries(formData.entries());

        // Add metadata
        data.package_id = selectedPackageId;
        data.payment_method = selectedPaymentMethod;
        data.timestamp = new Date().toISOString();

        // Get pricing
        const pricing = getPackagePrice(selectedPackageId);

        // User Data for Advanced Matching
        const userData = {
            fn: data.name,
            ln: data.surname,
            ph: data.phone.replace(/\s/g, ''),
            ct: data.city,
            country: 'tr',
            ad: data.address
        };

        const orderDetails = {
            value: pricing.total,
            currency: 'TRY',
            content_ids: [`package_${selectedPackageId}`],
            content_type: 'product',
            shipping_cost: pricing.shipping,
            payment_method: selectedPaymentMethod
        };

        // Generate unique event_id
        const eventId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        orderDetails.event_id = eventId;

        try {
            if (selectedPaymentMethod === 'online') {
                // Process Stripe payment
                submitBtn.innerText = 'Ödeme işleniyor...';

                // Create payment intent
                const paymentIntentResponse = await fetch('/.netlify/functions/create-payment-intent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: pricing.total,
                        packageId: selectedPackageId
                    })
                });

                if (!paymentIntentResponse.ok) {
                    throw new Error('Ödeme hazırlanamadı.');
                }

                const { clientSecret } = await paymentIntentResponse.json();

                // Confirm card payment
                const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                    payment_method: {
                        card: cardElement,
                        billing_details: {
                            name: `${data.name} ${data.surname}`,
                            phone: data.phone.replace(/\s/g, '')
                        }
                    }
                });

                if (stripeError) {
                    throw new Error(stripeError.message);
                }

                if (paymentIntent.status === 'succeeded') {
                    // Payment successful, add payment ID to data
                    data.stripe_payment_id = paymentIntent.id;
                    data.payment_status = 'paid';
                } else {
                    throw new Error('Ödeme tamamlanamadı.');
                }
            } else {
                // Cash on delivery
                data.payment_status = 'pending';
            }

            // Save data to localStorage  for success page
            localStorage.setItem('pixel_user_data', JSON.stringify(userData));
            localStorage.setItem('pixel_order_data', JSON.stringify(orderDetails));
            localStorage.setItem('pixel_event_sent', 'false');

            // Send order to webhook
            const webhook = window.env?.WEBHOOK_URL || CONFIG.WEBHOOK_URL;
            await fetch(webhook, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            console.log('Order submitted successfully.');
            window.location.href = 'success.html';

        } catch (error) {
            console.error('Submission Error:', error);
            alert(`Hata: ${error.message || 'Bir hata oluştu. Lütfen tekrar deneyin.'}`);
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Stripe
    initializeStripe();

    // Setup payment method selection
    setupPaymentMethodSelection();

    // Don't select any package by default - user must choose
    // Just render empty size selector
    renderSizeSelectors(0);
});
