/**
 * Rasterizer - creates a grid-like graph using a sampling function
 */

(function (global) {

//------------------------------------------------------------------------------

function Cell(x, y, value)
{
	this.x = x;
	this.y = y;
	this.value = value;
	this.edges = [];
	this.index = -1; // cell index used by ACO
}

function Edge(u,v)
{
	this.u = u; // origin cell
	this.v = v; // destination cell
	this.u.edges.push(this);
	//this.v.edges.push(this); // ignore incomming edges
	this.index = -1; // edge index used by ACO
}

function Grid()
{
	this.cells = [];
	this.edges = [];
}

Grid.prototype.add = function add(obj)
{
	if (obj.constructor == Cell)
	{
		obj.index = this.cells.length;
		this.cells.push(obj);
	}
	else if (obj.constructor == Edge)
	{
		obj.index = this.edges.length;
		this.edges.push(obj);
	}
}

Grid.prototype.eachCell = function forEachCell(func, obj)
{
	return this.cells.forEach(func, obj);
}

Grid.prototype.eachEdge = function forEachEdge(func, obj)
{
	return this.edges.forEach(func, obj);
}

Grid.prototype.toArray = function toArray()
{
	return {
		cells: this.cells.map(function (cell)
		{
			return cell.edges.map(function (edge)
			{
				return edge.index;
			});
		}),
		edges: this.edges.map(function (edge)
		{
			return edge.v.index;
		}),
	};
}

//------------------------------------------------------------------------------

function Rasterize(func, domain, resolution, type)
{
	domain = domain || [];
	resolution = resolution || [];
	var x1 = domain[0] || 0,
		y1 = domain[1] || 0,
		x2 = domain[2] || 1,
		y2 = domain[3] || 1,
		rx = resolution[0] || 10,
		ry = resolution[1] || 10,
		grid = new Grid(),
		rasterize = function rasterize() {
			this.value = func.call(cell, this.x, this.y);
		}, lookup = function lookup() {
			throw new Error('Not implemented');
		};

	if (!type || type == 'rectangular') /* ----------------------------- */
	{
		var dx = (x2 - x1) / rx,
			dy = (y2 - y1) / ry,
			cells = [],
			link = function(cell, x, y) {
				if ((x >= 0) && (x < cells[0].length)
				&& (y >= 0) && (y < cells.length))
					grid.add(new Edge(cell, cells[y][x]));
			};
		for (var y = y1 + dy / 2; y < y2; y += dy)
		{
			var row = [];
			for (var x = x1 + dx / 2; x < x2; x += dx)
			{
				var cell = new Cell(x, y);
				cell.rasterize = rasterize;
				row.push(cell);
				grid.add(cell);
			}
			cells.push(row);
		}
		for (var y = cells.length - 1; y >= 0; --y)
		{
			for (var x = cells[0].length - 1; x >= 0; --x)
			{
				link(cells[y][x], x - 1, y    );
				link(cells[y][x], x + 1, y    );
				link(cells[y][x], x    , y - 1);
				link(cells[y][x], x    , y + 1);
			}
		}
		lookup = function lookup(x, y)
		{
			x = Math.max(Math.min((x - x1 - dx / 2) / dx,
				cells[0].length - 1), 0);
			y = Math.max(Math.min((y - y1 - dy / 2) / dy,
				cells.length - 1), 0);
			return cells[y<<0][x<<0];
		}
	}
	else if (type == 'isometric') /* ----------------------------- */
	{
		throw new Error('Not implemented');
	}
	else if (type == 'hexagonal') /* ----------------------------- */
	{
		throw new Error('Not implemented');
	}

	grid.rasterize = function rasterize()
	{
		for (var i = 0, l = grid.cells.length; i < l; ++i)
			grid.cells[i].rasterize();
		return this;
	}
	grid.lookup = lookup;

	return grid.rasterize();
}

//------------------------------------------------------------------------------

global.Rasterize = Rasterize;
global.Rasterize.Cell = Cell;
global.Rasterize.Edge = Edge;
global.Rasterize.Grid = Grid;

})(window || this);

//------------------------------------------------------------------------------
