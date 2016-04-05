/**
 * Urban plan editor interface
 */

(function (global) {

//------------------------------------------------------------------------------

function Editor(id, aco, plan)
{
	this.svg = d3.select('#' + id);
	this.svg.selectAll('*').remove();
	this.sources = this.svg.append('g').attr('id', 'sources');
	this.targets = this.svg.append('g').attr('id', 'targets');
	this.cursor = this.svg.append('circle').attr('id', 'cursor').attr('r', 10);
	this.aco = aco;
	this.plan = plan;
	this.mode = 'pointer';
	this.onchange = null;
	this.changecounter = null;
	this.x = 0;
	this.y = 0;
	this.snap = [undefined, null];
	this.ox = 0;
	this.oy = 0;
	this.osnap = [undefined, null];

	var editor = this;
	this.svg.on('click', function ()
	{
		var coords = d3.mouse(this),
			d = d3.select(d3.event.target).datum();
		if (!d3.event.defaultPrevented)
			event.call(this, editor, 'click', d, coords[0], coords[1]);
	});
	this.drag = d3.behavior.drag()
		.on('drag', function (d)
			{ event.call(this, editor, 'drag', d, d3.event.x, d3.event.y); })
		.on('dragstart', function (d)
		{
			var coords = d3.mouse(this);
			event.call(this, editor, 'dragstart', d, coords[0], coords[1]);
		})
		.on('dragend', function (d)
		{
			var coords = d3.mouse(this);
			event.call(this, editor, 'dragend', d, coords[0], coords[1]);
		})
	;
	this.svg
		.on('mousedown', function (d)
		{
			var coords = d3.mouse(this);
			event.call(this, editor, 'dragstart', d, coords[0], coords[1]);
		})
		.on('mousemove', function (d)
		{
			var coords = d3.mouse(this);
			event.call(this, editor, 'mousemove', d, coords[0], coords[1]);
		})
		.on('mouseup', function (d)
		{
			var coords = d3.mouse(this);
			event.call(this, editor, 'dragend', d, coords[0], coords[1]);
		})
	;

	this.resize();
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
	return this;
}

Editor.prototype.update = function update()
{
	updateSources(this);
	updateTargets(this);
	return this;
}

Editor.prototype.changeMode = function changeMode(mode)
{
	this.mode = mode;
	var spot = (editor.mode == 'target' || editor.mode == 'source');
	this.sources.selectAll('circle')
		.style('cursor', spot ? 'move' : 'default')
	;
	this.targets.selectAll('circle')
		.style('cursor', spot ? 'move' : 'default')
	;
	this.svg.style('cursor', editor.mode == 'pointer' ? 'default' : 'none');
	this.cursor.style('display', editor.mode == 'pointer' ? 'none' : 'inherit');
	this.plan.clean();

	return this.update();
}

function event(editor, type, d, x, y)
{
	if (type == 'click' && editor.mode == 'source')
	{
		aco.addSource(editor.aco.grid.lookup(x, y), 50);
		updateSources(editor);
		if (editor.onchange) editor.onchange();
		editor.sources.selectAll('circle').style('cursor', 'move');
	}
	else if (type == 'click' && editor.mode == 'target')
	{
		aco.addTarget(editor.aco.grid.lookup(x, y), 50);
		updateTargets(editor);
		if (editor.onchange) editor.onchange();
		editor.targets.selectAll('circle').style('cursor', 'move');
	}
	else if ((editor.mode == 'target' || editor.mode == 'source') && (d && ('weight' in d)))
	{
		if (type == 'drag')
			d3.select(this).attr('cx', x).attr('cy', y);
		else if (type == 'dragend' && d instanceof ACO.Source)
		{
			editor.aco.updateSource(d.index, editor.aco.grid.lookup(x, y));
			updateSources(editor);
		}
		else if (type == 'dragend' && d instanceof ACO.Target)
		{
			editor.aco.updateTarget(d.index, editor.aco.grid.lookup(x, y));
			updateTargets(editor);
		}
	}
	else if (type == 'dragend' && editor.mode == 'road')
		draw(editor, editor.plan.roads, 'drawRoad');
	else if (type == 'dragend' && editor.mode == 'pavement')
		draw(editor, editor.plan.pavements, 'drawPavement');
	else if (type == 'dragend' && editor.mode == 'building')
		draw(editor, editor.plan.buildings, 'drawBuilding');
	else if (type == 'click' && editor.mode == 'demolish')
	{
		if (editor.snap[0] == 'dedge')
		{
			plan.roads.removeEdge(editor.snap[1]);
			plan.pavements.removeEdge(editor.snap[1]);
			plan.buildings.removeEdge(editor.snap[1]);
			plan.clean().update();
			wait_change(editor);
		}
	}

	if (type == 'mousemove')
	{
		editor.x = x << 0;
		editor.y = y << 0;

		if (editor.mode == 'road')
			snap(editor, editor.plan.roads, editor.plan.roadWidth / 2);
		else if (editor.mode == 'pavement')
			snap(editor, editor.plan.pavements, editor.plan.pavementWidth / 2);
		else if (editor.mode == 'building')
			snap(editor, editor.plan.buildings, editor.plan.pavementWidth / 2);
		else if (editor.mode == 'target' || editor.mode == 'source')
		{
			var cell = editor.aco.grid.lookup(x, y);
			editor.x = cell.x;
			editor.y = cell.y;
		}
		else if (editor.mode == 'demolish')
		{
			if (!edgesnap(editor, editor.plan.buildings, editor.plan.pavementWidth / 2))
				if (!edgesnap(editor, editor.plan.pavements, editor.plan.pavementWidth / 2))
					if (!edgesnap(editor, editor.plan.roads, editor.plan.roadWidth / 2))
						editor.snap = [undefined, null];
		}

		editor.cursor
			.attr('cx', editor.x)
			.attr('cy', editor.y)
			.attr('class', 'snap-' + editor.snap[0])
		;
	}

	if (type == 'dragstart')
	{
		editor.ox = editor.x;
		editor.oy = editor.y;
		editor.osnap = editor.snap;
	}
}

function snap(editor, dcel, distance)
{
	var closest = dcel.closestNode(editor.x, editor.y);
	if (closest[1] <= distance)
	{
		editor.snap = ['node', closest[0]];
		editor.x = closest[0].x;
		editor.y = closest[0].y;
	}
	else
	{
		closest = dcel.closestEdge(editor.x, editor.y);
		if (closest[2] <= distance)
		{
			editor.snap = ['edge', closest[0]];
			editor.x = closest[1].x;
			editor.y = closest[1].y;
		}
		else
			editor.snap = [undefined, null];
	}
}

function edgesnap(editor, dcel, distance)
{
	var closest = dcel.closestEdge(editor.x, editor.y);
	if (closest[2] <= distance)
	{
		editor.snap = ['dedge', closest[0]];
		editor.x = closest[1].x;
		editor.y = closest[1].y;
		return true;
	}
	return false;
}

function draw(editor, dcel, func)
{
	if (editor.osnap[0] == 'edge')
	{
		var node = dcel.addNode(editor.ox, editor.oy);
		dcel.connectNode(node, editor.osnap[1]);
	}
	if (editor.snap[0] == 'edge')
	{
		var node = dcel.addNode(editor.x, editor.y);
		dcel.connectNode(node, editor.snap[1]);
	}
	editor.plan[func](editor.ox, editor.oy, editor.x, editor.y);
	wait_change(editor);
}

function wait_change(editor)
{
	if (!aco.active) return;
	if (editor.changecounter)
		clearTimeout(editor.changecounter);
	editor.changecounter = setTimeout(function ()
	{
		aco.grid.rasterize();
		aco.changeHeuristic();
		editor.changecounter = null;
	}, 1000);
}

//------------------------------------------------------------------------------

function updateSources(editor)
{
	var sources = editor.sources.selectAll('circle').data(editor.aco.sources);
	sources.enter().append('circle').call(editor.drag);
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
	var targets = editor.targets.selectAll('circle').data(editor.aco.targets);
	targets.enter().append('circle').call(editor.drag);
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
