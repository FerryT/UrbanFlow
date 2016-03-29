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
$('#btns-state input').change(function ()
{
	if (this.value == 'start')
		aco.go();
	else if (this.value == 'stop')
		aco.halt();
});

function updateSetting(setting, update)
{
	var id = setting.replace('_', '-'),
		slider = $('#slr-'+id),
		span = $('#'+id+'-value');
	return function ()
	{
		var value = slider.slider('value');
		span.text(value);
		if (update)
		{
			var settings = {};
			settings[setting] = +value;
			aco.changeSettings(settings);
		}
	};
}
$('#slr-ant-count').slider({
	value: aco.settings.ant_count,
	min: 5, max: 100, step: 5,
	change: updateSetting('ant_count', true),
	slide: updateSetting('ant_count', false),
});
$('#slr-heuristic-power').slider({
	value: aco.settings.heuristic_power,
	min: Number.MIN_VALUE, max: 1, step: 0.001,
	change: updateSetting('heuristic_power', true),
	slide: updateSetting('heuristic_power', false),
});
$('#slr-trail-power').slider({
	value: aco.settings.trail_power,
	min: Number.MIN_VALUE, max: 1, step: 0.001,
	change: updateSetting('trail_power', true),
	slide: updateSetting('trail_power', false),
});
$('#slr-trail-decay').slider({
	value: aco.settings.trail_decay,
	min: Number.MIN_VALUE, max: 1, step: 0.001,
	change: updateSetting('trail_decay', true),
	slide: updateSetting('trail_decay', false),
});
$('#slr-trail-reward').slider({
	value: aco.settings.trail_reward,
	min: Number.MIN_VALUE, max: 1, step: 0.001,
	change: updateSetting('trail_reward', true),
	slide: updateSetting('trail_reward', false),
});
$('#slr-trail-feedback').slider({
	value: aco.settings.trail_feedback,
	min: Number.MIN_VALUE, max: 1, step: 0.001,
	change: updateSetting('trail_feedback', true),
	slide: updateSetting('trail_feedback', false),
});
updateSetting('ant_count')();
updateSetting('heuristic_power')();
updateSetting('trail_power')();
updateSetting('trail_decay')();
updateSetting('trail_reward')();
updateSetting('trail_feedback')();


$('#btns-tools').buttonset();
$('#btns-tools label').addClass('ui-corner-left').addClass('ui-corner-right');

//------------------------------------------------------------------------------

});

//------------------------------------------------------------------------------
