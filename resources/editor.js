/**
 * Urban plan editor interface
 */

(function (global) {

//------------------------------------------------------------------------------

function Editor(id, aco)
{
	this.svg = d3.select('#' + id);
	this.sources = this.svg.append('g').attr('id', 'sources');
	this.targets = this.svg.append('g').attr('id', 'targets');
	this.aco = aco;
	this.mode = 'pointer';

	this.resize();

	var editor = this;
	this.svg.on('click', function ()
	{
		var x = d3.mouse(this)[0],
			y = d3.mouse(this)[1];

		if (editor.mode == 'source')
		{
			aco.addSource(editor.aco.grid.lookup(x, y), 50);
			updateSources(editor);
		}
		else if (editor.mode == 'target')
		{
			aco.addTarget(editor.aco.grid.lookup(x, y), 50);
			updateTargets(editor);
		}
	});
}

Editor.prototype.resize = function resize()
{
	var domain = this.aco.grid.domain,
		resolution = this.aco.grid.resolution;
	this.width = domain[2] - domain[0];
	this.height = domain[3] - domain[1];
	this.cellwidth = this.width / resolution[0];
	this.cellheight = this.height / resolution[1];
	this.cellsize = Math.min(this.cellwidth, this.cellheight);
	this.svg
		.attr('width', this.width)
		.attr('height', this.height)
		.attr('viewBox', [
				domain[0], domain[1],
				this.width, this.height,
			].join(' '))
	;
	this.update();
}

Editor.prototype.update = function update()
{
	updateSources(this);
	updateTargets(this);
}

Editor.prototype.changeMode = function changeMode(mode)
{
	this.mode = mode;
}

//------------------------------------------------------------------------------

function updateSources(editor)
{
	var sources = editor.sources.selectAll('circle').data(editor.aco.sources),
		drag = d3.behavior.drag()
			.on('drag', function (d)
			{
				var coords = d3.mouse(this);
				d3.select(this)
					.attr('cx', coords[0])
					.attr('cy', coords[1])
				;
			})
			.on('dragend', function (d)
			{
				var coords = d3.mouse(this);
				editor.aco.updateSource(d.index,
					editor.aco.grid.lookup(coords[0], coords[1]));
				updateSources(editor);
			})
		;
	sources.enter().append('circle').call(drag);
	sources
		.attr('cx', function (d) { return d.cell.x; })
		.attr('cy', function (d) { return d.cell.y; })
		.attr('r', function (d) { return 10; })
		.attr('title', function (d) { return 'Source ' + (d.index + 1); })
	;
	sources.exit().remove();
}

function updateTargets(editor)
{
	var targets = editor.targets.selectAll('circle').data(editor.aco.targets),
		drag = d3.behavior.drag()
			.on('drag', function (d)
			{
				var coords = d3.mouse(this);
				d3.select(this)
					.attr('cx', coords[0])
					.attr('cy', coords[1])
				;
			})
			.on('dragend', function (d)
			{
				var coords = d3.mouse(this);
				editor.aco.updateTarget(d.index,
					editor.aco.grid.lookup(coords[0], coords[1]));
				updateTargets(editor);
			})
		;
	targets.enter().append('circle').call(drag);
	targets
		.attr('cx', function (d) { return d.cell.x; })
		.attr('cy', function (d) { return d.cell.y; })
		.attr('r', function (d) { return 10; })
		.attr('title', function (d) { return 'Target ' + (d.index + 1); })
	;
	targets.exit().remove();
}

//------------------------------------------------------------------------------

global.Editor = Editor;

})(window || this);

//------------------------------------------------------------------------------
