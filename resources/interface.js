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
	{
		aco.grid.rasterize();
		aco.changeHeuristic();
		aco.go();
	}
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
$('#spn-width').val(domain[2] / plan.scale);
$('#spn-height').val(domain[3] / plan.scale);

$('#spn-xres,#spn-yres').spinner({
	min: 10,
	step: 1,
	page: 5,
});
$('#spn-xres').val(resolution[0]);
$('#spn-yres').val(resolution[1]);

$('#btn-create').click(function ()
{
	var scale = 5;
	create($('#spn-width').val() * scale,
		$('#spn-height').val() * scale,
		[+$('#spn-xres').val(), +$('#spn-yres').val()], scale);

	aco.addSource(grid.lookup(-Infinity, -Infinity), 50);
	aco.addTarget(grid.lookup(Infinity, Infinity), 50);
	editor.update();
}).button();

$('#btn-load').click(function ()
{
	var file = $('#sel-plans').val();
	if (!file) return;
	$.ajax({
		url: 'plans/' + file,
		dataType: 'jsonp',
		crossDomain: true,
		jsonpCallback: 'UrbanFlowPlan',
		success: function (data)
		{
			create(
				data.domain[2], data.domain[3],
				data.resolution, data.scale);
			data.sources.forEach(function (d)
			{
				aco.addSource(grid.lookup(d.cell[0], d.cell[1]), d.weight);
			});
			data.targets.forEach(function (d)
			{
				aco.addTarget(grid.lookup(d.cell[0], d.cell[1]), d.weight);
			});
			plan.unserialize(data);
			editor.update();
			aco.grid.rasterize();
			aco.changeHeuristic();
		},
	});
}).button();
$('#sel-plans').selectmenu();
$.ajax({
	url: 'plans/list.txt',
	dataType: 'jsonp',
	crossDomain: true,
	jsonpCallback: 'Planlist',
	success: function (data)
	{
		for (var file in data)
			$('#sel-plans').append($('<option>')
				.attr('value', file)
				.text(data[file]));
		$('#sel-plans').selectmenu('refresh');
	},
});
$('#btn-save').click(function ()
{
	function spot(d) { return { cell: [d.cell.x, d.cell.y], weight: d.weight }; }
	var data = plan.serialize();
	data.resolution = resolution;
	data.sources = aco.sources.map(spot);
	data.targets = aco.targets.map(spot);
	data = 'UrbanFlowPlan(' + JSON.stringify(data) + ')';
	var blob = new Blob([data], {
			type: 'application/javascript',
		});
	saveAs(blob, 'unnamed.ufp');
}).button();

function create(width, height, res, scale)
{
	$('#rad-start').prop('checked', false);
	$('#rad-stop').prop('checked', true);
	$('#btns-state').buttonset('refresh');

	domain = [0, 0, width, height];
	resolution = res;
	plan = new Plan('plan', domain);
	grid = Rasterize(plan.getRaster(), domain, resolution);
	editor = new Editor('editor', aco, plan);

	aco.changeGrid(grid);
	aco.changeSettings({ iteration_limit: (res[0] + res[1]) * 10 });
	plan.resize();
	visuals.resize();
	editor.resize();

	$('#btns-tools input').prop('checked', false);
	$('#rad-pointer').prop('checked', true).trigger('change');
}

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
		visuals.redraw();
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
					editor.update();
					updateTargets();
				});
		})(i);
}

updateSources();
updateTargets();

editor.onchange = function ()
{
	updateSources();
	updateTargets();
};

//------------------------------------------------------------------------------
// Visualization

$('#btns-vis').buttonset();
$('#btns-vis label').addClass('ui-corner-left').addClass('ui-corner-right');
$('#btns-vis input').change(function ()
{
	if (this.value == 'heatmap')
		visuals = new Heatmap('visuals', aco);
	else if (this.value == 'flowmap')
		visuals = new Flowmap('visuals', aco);
	else if (this.value == 'hybrid')
		visuals = new Hybrid('visuals', aco);
});

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
