/**
 * Interface
 */

$(function () {

//------------------------------------------------------------------------------

$('header h1').text(document.title);

$('#proptabs').accordion({
	heightStyle: 'fill',
});

$('#btns-state').buttonset();

$('#btns-tools').buttonset();
$('#btns-tools label').addClass('ui-corner-left').addClass('ui-corner-right');

//------------------------------------------------------------------------------

});

//------------------------------------------------------------------------------
