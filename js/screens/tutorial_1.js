function set_email_address() {
	var email_address = document.getElementById('emailAddress').value;
	
	// If we've got a valid e-mail address, save it and contact the API to create an account.
	if ( isRFC822ValidEmail(email_address) == true ) {
		document.getElementById('div_error_message').innerHTML = '&nbsp;';
		
		var str_url = api_url + '?key=' + api_key + '&action=1&email=' + email_address;
		var str_response = data_retrieve(str_url);
		var json_data = JSON.parse(str_response);
		
		if ( json_data.success == '1' ) {
			emailIsSet = 1;
			localStorage.setItem('emailIsSet', emailIsSet);
			
			emailAddress = email_address;
			localStorage.setItem('emailAddress', emailAddress);
			
			secretKey = json_data.secret_key;
			localStorage.setItem('secretKey', secretKey);
			
			bb.pushScreen('screens/tutorial_2.html', 'tutorial_2');
		}
		else {
			document.getElementById('div_error_message').innerHTML = json_data.error_message;
		}
	}
	else {
		document.getElementById('div_error_message').innerHTML = 'That is not a valid e-mail address.'; 
	}
}

function isRFC822ValidEmail(sEmail) {

  var sQtext = '[^\\x0d\\x22\\x5c\\x80-\\xff]';
  var sDtext = '[^\\x0d\\x5b-\\x5d\\x80-\\xff]';
  var sAtom = '[^\\x00-\\x20\\x22\\x28\\x29\\x2c\\x2e\\x3a-\\x3c\\x3e\\x40\\x5b-\\x5d\\x7f-\\xff]+';
  var sQuotedPair = '\\x5c[\\x00-\\x7f]';
  var sDomainLiteral = '\\x5b(' + sDtext + '|' + sQuotedPair + ')*\\x5d';
  var sQuotedString = '\\x22(' + sQtext + '|' + sQuotedPair + ')*\\x22';
  var sDomain_ref = sAtom;
  var sSubDomain = '(' + sDomain_ref + '|' + sDomainLiteral + ')';
  var sWord = '(' + sAtom + '|' + sQuotedString + ')';
  var sDomain = sSubDomain + '(\\x2e' + sSubDomain + ')*';
  var sLocalPart = sWord + '(\\x2e' + sWord + ')*';
  var sAddrSpec = sLocalPart + '\\x40' + sDomain; // complete RFC822 email address spec
  var sValidEmail = '^' + sAddrSpec + '$'; // as whole string
  
  var reValidEmail = new RegExp(sValidEmail);
  
  if (reValidEmail.test(sEmail)) {
    return true;
  }
  
  return false;
}