
let loans = [];
try {
    const parsed = JSON.parse(window.name || '[]');
    if (Array.isArray(parsed)) {
        loans = parsed;
    }
} catch (e) {
}

window.loans = loans;


if (window.location.pathname.includes('dashboard.html') && window.opener) {
    loans = window.opener.loans || [];
}

$(document).ready(function() {
    // AUTHENTICATION helper
    const isLoginPage = window.location.pathname.includes('login.html');
    const loggedIn = sessionStorage.getItem('loggedIn') === 'true';

    function showNav(show) {
        if (show) {
            $('nav').show();
        } else {
            $('nav').hide();
        }
    }

    // if we are on any page except login and not logged in, redirect
    if (!isLoginPage && !loggedIn) {
        window.location.href = 'login.html';
        return; // stop further execution
    }
    // if on login and already logged in, go to main app
    if (isLoginPage && loggedIn) {
        window.location.href = 'application.html';
        return;
    }

    // if on login page, wire up form handler
    if (isLoginPage) {
        $('#loginForm').on('submit', function(e) {
            e.preventDefault();
            const user = $('#username').val();
            const pass = $('#password').val();
            if (user === 'admin' && pass === 'admin') {
                sessionStorage.setItem('loggedIn', 'true');
                window.location.href = 'application.html';
            } else {
                $('#loginError').text('Invalid credentials').show();
            }
        });
    }

    // show/hide nav depending on login state
    showNav(loggedIn);

    // handle logout click (nav item must exist)
    $(document).on('click', '#logoutLink', function(e) {
        e.preventDefault();
        sessionStorage.removeItem('loggedIn');
        window.location.href = 'login.html';
    });

    // Handle loan application form submission on application.html
    $('#loanForm').on('submit', function(e) {
        e.preventDefault(); // Prevent default form submission
        
        // Collect form data from application.html
        const loanData = {
            name: $('#name').val().trim(),
            email: $('#mail').val().trim(),
            loanAmount: $('#amount').val(),
            interestRate: $('#interest').val(),
            loanTenure: $('#tenure').val(),
            monthlyIncome: $('#income').val(),
            address: $('#address').val().trim(),
            phone: $('#phone').val(),
            loanType: $('#loanType').val(),
            status: "Approved"
        };

        // Validate required fields
        if (!loanData.name || !loanData.email || !loanData.loanAmount || !loanData.interestRate || 
            !loanData.loanTenure || !loanData.monthlyIncome || !loanData.address || !loanData.phone || 
            !loanData.loanType) {
            
            const errorMsg = `
                <div class="alert alert-danger alert-dismissible fade show">
                  Please fill all fields
                  <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            $('#messageBox').html(errorMsg);
            return;
        }

        // Validate loan amount (minimum 50000)
        const loanAmount = parseFloat(loanData.loanAmount);
        if (isNaN(loanAmount) || loanAmount < 50000) {
            const errorMsg = `
                <div class="alert alert-danger alert-dismissible fade show">
                  Loan amount must be at least ₹50,000
                  <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            $('#messageBox').html(errorMsg);
            return;
        }

        // Validate phone number (exactly 10 digits)
        const phonePattern = /^[0-9]{10}$/;
        if (!phonePattern.test(loanData.phone)) {
            const errorMsg = `
                <div class="alert alert-danger alert-dismissible fade show">
                  Phone number must be exactly 10 digits
                  <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            $('#messageBox').html(errorMsg);
            return;
        }

        // Validate interest rate (must be a valid number, decimals allowed)
        const interestRate = parseFloat(loanData.interestRate);
        if (isNaN(interestRate) || interestRate <= 0) {
            const errorMsg = `
                <div class="alert alert-danger alert-dismissible fade show">
                  Interest rate must be a valid positive number
                  <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            $('#messageBox').html(errorMsg);
            return;
        }

        // Add to loans array
        loans.push(loanData);
        // persist in window.name for navigation within same tab
        try {
            window.name = JSON.stringify(loans);
        } catch (e) {
            console.warn('could not stringify loans for window.name', e);
        }

        // Show success message
        const successMsg = `
            <div class="alert alert-success alert-dismissible fade show">
              Loan application submitted successfully!
              <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        $('#messageBox').html(successMsg);

        // Reset form
        $('#loanForm')[0].reset();

        // Update dashboard table if we're on the dashboard page
        updateDashboardTable();

        console.log('Updated loans array:', loans);
    });

    // Handle EMI calculation form submission
    $('#emiCalcForm').on('submit', function(e) {
        e.preventDefault();
        
        // Get values from EMI calculator form
        const principalInput = $('#emi_amount').val();
        const annualInterestInput = $('#emi_interest').val();
        const monthsInput = $('#emi_tenure').val();

        const principal = parseFloat(principalInput);
        const annualInterestRate = parseFloat(annualInterestInput);
        const months = parseInt(monthsInput);

        if (!principal || !annualInterestRate || !months) {
            alert('Please fill all fields for EMI calculation');
            return;
        }

        // Calculate EMI using the standard formula
        const monthlyInterestRate = annualInterestRate / (12 * 100);
        const emi = (principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, months)) / 
                   (Math.pow(1 + monthlyInterestRate, months) - 1);
                   
        const totalPayment = emi * months;
        const totalInterest = totalPayment - principal;

        // Create and display results in a card
        const resultCard = `
            <div class="card mt-4" id="emiResultCard">
                <div class="card-header bg-primary text-white">
                    <h5>EMI Calculation Result</h5>
                </div>
                <div class="card-body">
                    <div class="row text-center">
                        <div class="col-md-4 mb-3">
                            <h6>Monthly EMI</h6>
                            <p class="text-primary fs-5 fw-bold">₹${emi.toFixed(2)}</p>
                        </div>
                        <div class="col-md-4 mb-3">
                            <h6>Total Payment</h6>
                            <p class="text-primary fs-5 fw-bold">₹${totalPayment.toFixed(2)}</p>
                        </div>
                        <div class="col-md-4 mb-3">
                            <h6>Total Interest</h6>
                            <p class="text-primary fs-5 fw-bold">₹${totalInterest.toFixed(2)}</p>
                        </div>
                    </div>
                    
                </div>
            </div>
        `;

        // Remove any existing result card and append new one
        $('#emiResultCard').remove();
        $('#emi-results').html(resultCard);
    });

    // Hide dashboard view by default; may override below when necessary
    $('.page3').hide();

    // if the user opened dashboard.html directly, show the dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        $('.page1').hide();
        $('.page3').show();
        updateDashboardTable();
        $('a.nav-link').removeClass('active');
        $('a.nav-link[href="dashboard.html"]').addClass('active');

        // when there's an opener window we can keep the table in sync
        if (window.opener) {
            window.addEventListener('message', function(ev) {
                if (ev.data && ev.data.type === 'loan-updated') {
                    loans = window.opener.loans || [];
                    updateDashboardTable();
                }
            });
        }
    }

    $('a.nav-link').on('click', function(e) {
        const href = $(this).attr('href') || '';
        // prevent click on logout link being treated as nav navigation
        if (href === '#logout') return;
        // if dashboard link is clicked, open in same page or new window depending
        if (href.includes('dashboard.html') && !e.ctrlKey && !e.metaKey && $('.page1').length > 0) {
            e.preventDefault();
            // manage active state
            $('a.nav-link').removeClass('active');
            $(this).addClass('active');

            $('.page1').hide();
            $('.page3').show();
            updateDashboardTable();
            return;
        }
        // other links behave normally (including ctrl-click to open new tab)
    });
});

// Function to update the dashboard table with loan data
function updateDashboardTable() {
    const tbody = $('table tbody');
    tbody.empty(); // clear existing rows

    // Add each loan to the table
    loans.forEach((loan, index) => {
        const row = `
            <tr>
                <th scope="row">${index + 1}</th>
                <td>${loan.name}</td>
                <td>${loan.email}</td>
                <td>₹${parseFloat(loan.loanAmount).toLocaleString()}</td>
                <td>${loan.loanTenure} months</td>
                <td>₹${parseFloat(loan.monthlyIncome).toLocaleString()}</td>
                <td>${loan.address}</td>
                <td><span class="badge bg-primary">${loan.status}</span></td>
            </tr>
        `;
        tbody.append(row);
    });

    // If no loans, show a message
    if (loans.length === 0) {
        tbody.append(`
            <tr>
                <td colspan="8" class="text-center py-4">No loan applications found</td>
            </tr>
        `);
    }

}

