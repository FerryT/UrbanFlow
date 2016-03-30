/**
 * Interface
 */

$(function () {

//------------------------------------------------------------------------------
// Interface


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

$(function () { $('#loader').fadeOut(); });

//------------------------------------------------------------------------------
// General

function updateStatus()
{
	function s(number, word)
	{
		return '' + number + ' ' + (number == 1 ? word : word + 's');
	}
	if (aco.colony.workers[0].emulated)
		$('#warning').show();
	else
		$('#warning').hide();

	var mark = aco.benchmark();
	mark = Math.round((mark[0] / mark[1]) * 1000);

	$('#status')
		.empty()
		.text('Using '+ s(aco.colony.size, 'thread') + ' generating ' + s(mark, 'path') + ' a second.')
	;
}

setTimeout(updateStatus, 500);
setInterval(updateStatus, 3000);

$('#spn-width,#spn-height').spinner({
	min: 10,
	step: 10,
	page: 10,
});
$('#spn-width').val(domain[2]);
$('#spn-height').val(domain[3]);

$('#spn-xres,#spn-yres').spinner({
	min: 10,
	step: 1,
	page: 5,
});
$('#spn-xres').val(resolution[0]);
$('#spn-yres').val(resolution[1]);

$('#btn-create').button();
$('#btn-create').click(function ()
{
	$('#rad-start').prop('checked', false);
	$('#rad-stop').prop('checked', true);
	$('#btns-state').buttonset('refresh');
	domain = [0, 0, $('#spn-width').val(), $('#spn-height').val()],
	resolution = [$('#spn-xres').val(), $('#spn-yres').val()],
	grid = Rasterize(function (){}, domain, resolution);
	aco.changeGrid(grid);
	aco.addSource(grid.lookup(-Infinity, -Infinity), 50);
	aco.addTarget(grid.lookup(Infinity, Infinity), 50);
	heatmap.resize();
	editor.resize();
});


//------------------------------------------------------------------------------
// Algorithm

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

$('#btn-reset')
	.click(function ()
	{
		aco.reset();
		heatmap.redraw();
		editor.update();
	})
	.button()
;

//------------------------------------------------------------------------------
// Sources / Targets

function createSpot(container, name, weight, change, remove)
{
	var slider = $('<div>').slider({
		min: 0,
		max: 100,
		step: 1,
		value: weight,
		change: change,
	});
	container.append($('<p>')
		.append(name)
		.append($('<button class="remove">')
			.click(remove)
			.button({
				icons: { primary: 'ui-icon-trash' },
				text: false,
			}))
		.append(slider));
}

function updateSources()
{
	var sources = $('#pan-sources');
	sources.empty();
	for (var i = 0, l = aco.sources.length; i < l; ++i)
		(function (i)
		{
			createSpot(sources, 'Source ' + (i + 1), aco.sources[i].weight,
				function ()
				{
					aco.updateSource(i, $(this).slider('value'));
				},
				function ()
				{
					aco.removeSource(i);
					editor.update();
					updateSources();
				});
		})(i);
}

function updateTargets()
{
	var targets = $('#pan-targets');
	targets.empty();
	for (var i = 0, l = aco.targets.length; i < l; ++i)
		(function (i)
		{
			createSpot(targets, 'Target ' + (i + 1), aco.targets[i].weight,
				function ()
				{
					aco.updateTarget(i, $(this).slider('value'));
				},
				function ()
				{
					aco.removeTarget(i);
					updateTargets();
				});
		})(i);
}

updateSources();
updateTargets();


//------------------------------------------------------------------------------
// Toolbar

$('#btns-tools').buttonset();
$('#btns-tools label').addClass('ui-corner-left').addClass('ui-corner-right');
$('#btns-tools input').change(function ()
{
	editor.changeMode(this.value);
});

//------------------------------------------------------------------------------
// Misc

$('#editor').tooltip({ track: true });

});

//------------------------------------------------------------------------------
