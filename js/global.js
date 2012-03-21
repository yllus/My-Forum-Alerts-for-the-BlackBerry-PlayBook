// Debug area.
//localStorage.setItem('emailIsSet', 0);
//localStorage.setItem('emailAddress', null);
//localStorage.setItem('secretKey', null);

// Global variables.
var emailIsSet = 0;
var emailAddress = null;
var secretKey = null;
if (typeof localStorage !== 'undefined') {
	emailIsSet = parseInt(localStorage.getItem("emailIsSet"));
	emailAddress = localStorage.getItem("emailAddress");
	secretKey = localStorage.getItem("secretKey");
}

// The "traffic cop" function controlling what JS gets executed when a screen has loaded (but is not yet 
// displayed), so refer to element.
bb.onscreenready = function(element, id) {
	switch ( id ) {
		case 'home':
			var str_template = data_retrieve('data/add.html');
			element.getElementById('div_content').innerHTML = str_template;
			break;
	}
}

function do_just_launched() {
	// If the e-mail address field is blank, launch the tutorial / input screen.
	// Else jump directly into the app.
	if ( emailIsSet == 0 ) {
		bb.pushScreen('screens/tutorial_1.html', 'tutorial_1');
	}
	else {
		bb.pushScreen('screens/home.html', 'home');
	}
}

function do_tab_add() {
	var str_template = data_retrieve('data/add.html');
	document.getElementById('div_content').innerHTML = str_template;
	bb.dropdown.apply(document.querySelectorAll('select'));
	bb.button.apply(document.querySelectorAll('[data-bb-type=button]'));
}

function do_tab_manage() {
	// Before calling the API, put placeholder content in the tabbed area.
	var str_template = data_retrieve('data/manage.html');
	document.getElementById('div_content').innerHTML = str_template;
	
	// Call the API to retrieve the current list of alerts for the user.
	var str_url = api_url + '?key=' + api_key + '&action=3&secret_key=' + secretKey;
	var str_response = data_retrieve(str_url);
	var json_data = JSON.parse(str_response);
	
	// If an error occurred, stop processing immediately.
	if ( json_data.success == '0' ) {
		document.getElementById('div_manage_alerts').innerHTML = 'Sorry, please try again later.';
		
		return true;
	}
	
	// Iterate through the list of alerts to create a string to present to the user.
	var str_alerts = '';
	var str_alert = data_retrieve('data/alert.html');
	for ( var i = 0; i < json_data.num_alerts; i++ ) {
		var str_instance = str_alert;
		str_instance = str_instance.replace('${forum_name}', json_data.alerts[i]['forum_name']);
		str_instance = str_instance.replace('${categories}', json_data.alerts[i]['categories']);
		str_instance = str_instance.replace('${keywords}', json_data.alerts[i]['keywords']);
		str_instance = str_instance.replace('${num_matches}', json_data.alerts[i]['num_matches']);
		
		if ( json_data.alerts[i]['is_enabled'] == 'Y' ) {
			str_instance = str_instance.replace('${is_enabled}', 'enabled');
		}
		else {
			str_instance = str_instance.replace('${is_enabled}', 'disabled');
		}
		
		str_alerts = str_alerts + str_instance;
	}
	
	// Add to the DOM.
	document.getElementById('div_manage_alerts').innerHTML = str_alerts;
	
	return true;
}

function do_tab_matches() {
	var str_template = data_retrieve('data/matches.html');
	document.getElementById('div_content').innerHTML = str_template;
}

function display_subcategories() {
	var e = document.getElementById('forum_id');
	var forum_id = parseInt(e.options[e.selectedIndex].value);	
	if ( forum_id != 0 ) {
		var str_radiolist = '';
		var int_catcount = 1;
		var str_categories = data_retrieve('data/subcategories.html');
		var arr_categories = str_categories.split('\n');
		for ( var i = 0; i < arr_categories.length; i++ ) {
			var arr_category = arr_categories[i].split('|');
			if ( forum_id == parseInt(arr_category[0]) ) {
				str_radiolist = str_radiolist + '<div style="width: 325px; height: 35px; float: left;"><input type="checkbox" style="height: 20px; width: 20px;" name="cat_' + (int_catcount - 1) + '" id="cat_' + (int_catcount - 1) + '" value="' + arr_category[1] + '" /> <label for="cat_' + (int_catcount - 1) + '">' + arr_category[2] + '</label>' + "</div>\n";
				if ( int_catcount % 2 == 0 ) {
					str_radiolist = str_radiolist + '';
				}
				int_catcount++;
			}
		}
		document.getElementById('div_subcategory').innerHTML = str_radiolist;
	}
	else {
		document.getElementById('div_subcategory').innerHTML = 'Select a forum to proceed.'; 
	}
}

function add_alert() {
	// Gather information from the form.
	var int_forumid = parseInt(document.getElementById('forum_id').value);
	var str_catids = get_category_selections();
	var str_keywords = document.getElementById('step2_keywords').value;
	
	// Do basic validation.
	if ( int_forumid == 0 ) {
		alert('A forum must be selected.');
		
		return false;
	}	
	if ( str_catids.length < 1 ) {
		alert('At least one category must be selected.');
		
		return false;
	}
	if ( str_keywords.length < 1 ) {
		alert('The keywords field cannot be blank.');
		
		return false;
	}
	
	// Call remote API.
	var str_url = api_url + '?key=' + api_key + '&action=2&email=' + emailAddress + '&forum_id=' + int_forumid + '&cat=' + str_catids + '&keywords=' + str_keywords;
	
	// Read response.
	var str_response = data_retrieve(str_url);
	var json_data = JSON.parse(str_response);
	
	if ( json_data.success == '1' ) {
		bb.pushScreen('screens/success_add.html', 'success_add');
	}
	else {
		alert(json_data.error_message);
	}
}

function get_category_selections() {
	var str_categories = '';
	var i = 0;
	while ( document.getElementById('cat_' + i) ) {
		if ( document.getElementById('cat_' + i).checked ) {
			str_categories = str_categories + document.getElementById('cat_' + i).value + ',';
		}
		i++;
	}
	
	return str_categories;
}

function screen_load_main() {
	bb.pushScreen('screens/home.html', 'home');
}

function button_back() {
	var num_screens = bb.screens.length;
	
	if ( num_screens > 1 ) {
		bb.popScreen();
	}
	else {
		bb.pushScreen('screens/home.html', 'home');
	}
}

function data_retrieve( url ) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open("GET", url, false);
	xmlhttp.send();
	
	return xmlhttp.responseText;
}