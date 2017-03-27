$(document).ready(function(){
    var APP_STATE = {
            activePanel: 'selectPizza',
            pizzaSelection: [],
            totalPrice: 0,
            userEmail: '',
            accountId: '',
            locations: [],
            selectAddress: '',
            orderId: '',
            orderStatus: 0,
        },
        API_URL = document.location.hostname + ":8081/api/";

    // Helper methods
    function validateEmail(email) {
        var email_regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return email_regex.test(email);
    }

    function showErrorMessage(msg) {
        $('.errorMsg').html('<div class="alert alert-danger alert-dismissible" role="alert">' +
            '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
            '<strong>Error!</strong> ' + msg +
        '</div>');
    }

    function switchPanel(panelId) {
        $('.allPanels .panel').hide();

        $('.' + panelId).show();
    }

    function renderPizzaMenu(menuItems) {
        var tableHtml = '<thead><tr><th class="col-sm-1">#</th><th>Item</th><th class="col-sm-1">Price</th><th class="col-sm-1">Quantity</th></tr></thead><tbody>';

        menuItems.forEach(function(menuItem, index) {
            tableHtml += '<tr><td>' + (index + 1) + '</td><td>' + menuItem.Name + '</td><td class="unitPrice">$' + menuItem.UnitPrice + '</td>';

            tableHtml += '<td><span class="pizzaQuantity"><input type="number" class="form-control" data-unitPrice="' + menuItem.UnitPrice + '" data-pizzaName="' + menuItem.Name + '" placeholder="0" /></span></td></tr>'
        });

        tableHtml += '</tbody>';

        $('.pizzaMenuTable').html(tableHtml);
    }

    function storePizzaSelection() {
        var pizzaSelection = [],
            totalPrice = 0,
            isError;

        $('.pizzaQuantity').each(function(index, spanNode) {
            var inputNode,
                quantity;

            spanNode = $(spanNode)
            inputNode = $(spanNode.find('input'));
            quantity = Number(inputNode.val());

            spanNode.removeClass('has-error');

            if (quantity < 0) {
                spanNode.addClass('has-error');
                isError = true;
                return;
            } else if (quantity > 0) {
                pizzaSelection.push({
                    name: inputNode.data('pizzaname'),
                    unitPrice: Number(inputNode.data('unitprice')),
                    quantity: quantity
                });

                totalPrice += (Number(inputNode.data('unitprice')) * quantity);
            }
        });

        if (!isError) {
            APP_STATE.totalPrice = totalPrice;
            APP_STATE.pizzaSelection = pizzaSelection;
            switchPanel('enterEmail');
        }
    }

    function storeUserEmail() {
        var jqxhr,
            inputNode = $('#userEmail'),
            userEmail = inputNode.val().trim();

        if (!(userEmail && validateEmail(userEmail))) {
            $('.userEmailDiv').addClass('has-error');
            return;
        }

        APP_STATE.userEmail = userEmail;

        jqxhr = $.getJSON(API_URL + "users?email=" + userEmail, function(data) {
            if (data.status === "200") {
                APP_STATE.accountId = data.id;

                $.getJSON(API_URL + "locations?accId=" + data.id, function(data) {
                    APP_STATE.locations = data;
                    renderAddressPanel();

                }).fail(function() {
                    showErrorMessage("Cannot fetch Addresses for User.");
                });
            } else {
                renderAddressPanel();
            }
        })
        .fail(function() {
            showErrorMessage("Cannot fetch User details.");
        });
    }

    function saveNewAddress() {
        var formData = {
            emailId: APP_STATE.userEmail
        };

        if ($('.selectAddress form #fName').val()) {
            formData.fName = $('.selectAddress form #fName').val();
        }

        if ($('.selectAddress form #lName').val()) {
            formData.lName = $('.selectAddress form #lName').val();
        }

        if ($('.selectAddress form #street').val()) {
            formData.street = $('.selectAddress form #street').val();
        }

        if ($('.selectAddress form #city').val()) {
            formData.city = $('.selectAddress form #city').val();
        }

        if ($('.selectAddress form #state').val()) {
            formData.state = $('.selectAddress form #state').val();
        }

        formData.country = 'USA';

        $.post(API_URL + "locations", formData, function(data) {
            // render locations again
            APP_STATE.accountId = data.id;
            APP_STATE.locations = data.locations;
            renderAddressPanel();
        });
    }

    function renderAddressPanel() {
        switchPanel('selectAddress');

        APP_STATE.locations.forEach(function(location) {
            $('.address-list').append('<div class="radio"><label><input type="radio" name="locationRadios" value="' + location.Id + '"></input>' +
                '<p>' + (location.fName ? location.fName + ' ' : '') +
                (location.lName ? location.lName : '') + ', ' +
                (location.street ? location.street + ' ' : '') +
                (location.city ? location.city + ' ' : '') +
                (location.state ? location.state + ' ' : '') +
                (location.country ? location.country : '') + '</p></label></div>');
        });
    }

    function renderOrderSummary() {
        // First store selected address

        var selectedAddress = $(".address-list input:checked").val();

        if (!selectedAddress) {
            showErrorMessage('Please select one address');
            return;
        }

        APP_STATE.selectedAddress = selectedAddress;

        switchPanel('placeOrder');

        // Render summary table
        var tableHtml = '<thead><tr><th class="col-sm-1">#</th><th>Item</th><th class="col-sm-1">Price</th><th class="col-sm-1">Quantity</th></tr></thead><tbody>';

        APP_STATE.pizzaSelection.forEach(function(menuItem) {
            tableHtml += '<tr><td>' + (index + 1) + '</td><td>' + menuItem.name + '</td><td class="unitPrice">$' + menuItem.unitPrice + '</td>';

            tableHtml += '<td>' + menuItem.quantity + '</td></tr>'
        });

        tableHtml += '</tbody>';

        $('.orderSummaryTable').html(tableHtml);

        $('.totalPrice').html('Total Price: $' + APP_STATE.totalPrice);

        $('.summaryAddress').html('Delivery to: ' + APP_STATE.selectedAddress);
    }

    function setOrderTrackerTimer() {
        setInterval(function() {
            $.getJSON(API_URL + "orders?orderId=" + APP_STATE.orderId, function(data) {
                var statusPos = 3;

                if (data.status === "Order Created") {
                    statusPos = 0;
                } else if (data.status === "Order Processing") {
                    statusPos = 1;
                } else if (data.status === "Order Processing") {
                    statusPos = 2;
                }

                $('.trackOrder .progress-bar').get(statusPos).style.width = "25%";
            });
        }, 2000);
    }

    function renderTrackOrder() {
        $.post(API_URL + "/orders", function(data) {
            $(".result").html(data);

            APP_STATE.orderId = data.orderId;

            switchPanel('trackOrder');

            $('.trackOrderId').html('Your order id is ' + data.orderId);

            // Set tracking timer
            setOrderTrackerTimer();

        }, function() {
            showErrorMessage("Cannot place Order. Please try again.");
        });
    }

    // XHR helpers
    function getPizzaMenu() {
        var data = [{
"Name": "Buffallo Chicken Pizza",
"UnitPrice": "13.0"
},
{
"Name": "Chicken Pizza",
"UnitPrice": "12.0"
},
{
"Name": "Deluxe Pizza",
"UnitPrice": "11.0"
},
{
"Name": "Diet Coke",
"UnitPrice": "2.0"
},
{
"Name": "Hawaiian Pizza",
"UnitPrice": "10.0"
},
{
"Name": "Pasta Marinara",
"UnitPrice": "8.0"
},
{
"Name": "Pepporoni Piiza",
"UnitPrice": "12.0"
},
{
"Name": "Regular Coke",
"UnitPrice": "1.5"
},
{
"Name": "Veggie Pizza",
"UnitPrice": "10.0"
}
];
        var jqxhr = $.getJSON(API_URL + "/menu", function(data) {
            renderPizzaMenu(data);
        })
        .fail(function() {
            showErrorMessage("Cannot fetch Pizza menu.");
            renderPizzaMenu(data);
        });
    }

    // Add event handlers
    $('.selectPizzaBtn').click(storePizzaSelection);

    $('.enterEmailBtn').click(storeUserEmail);

    $('.saveAddressBtn').click(saveNewAddress);

    $('.selectAddressBtn').click(renderOrderSummary);

    $('.placeOrderBtn').click(renderTrackOrder);

    // All default actions

APP_STATE.locations =
[
  {
    "Id": "00361000008qz4BAAQ",
    "fName": "Rose",
    "lName": "Gonzalez",
    "street": "313 Constitution Place\nAustin, TX 78767\nUSA",
    "city": null,
    "state": null,
    "country": null
  },
  {
    "Id": "00361000008qz4CAAQ",
    "fName": "Sean",
    "lName": "Forbes",
    "street": "312 Constitution Place\nAustin, TX 78767\nUSA",
    "city": null,
    "state": null,
    "country": null
  },
  {
    "Id": "00361000013kM8xAAE",
    "fName": "Abhishek",
    "lName": "Walia",
    "street": "312 Constitution Place",
    "city": "Austin",
    "state": "TX",
    "country": "USA"
  }
];

    //option A
    $("form").submit(function(e){
        e.preventDefault();
    });

    //select first panel
    switchPanel('selectPizza');
    // renderAddressPanel();
    // Fetch Pizza menu
    getPizzaMenu();
});
