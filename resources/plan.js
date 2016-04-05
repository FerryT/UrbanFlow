/**
 * Urban plan representation
 */

(function (global) {

//------------------------------------------------------------------------------

function Plan(id, domain, scale)
{
	this.svg = d3.select('#' + id);
	this.svg.selectAll('*').remove();
	this.map = {}
	this.map.roads = this.svg.append('path').attr('id', 'roads');
	this.map.roadlines = this.svg.append('path').attr('id', 'roadlines');
	this.map.pavements = this.svg.append('path').attr('id', 'pavements');
	this.map.buildings = this.svg.append('g').attr('id', 'buildings');
	this.map.buildinglines = this.svg.append('path').attr('id', 'buildinglines');
	this.domain = domain;
	this.scale = scale || 5; // px a meter

	this.roadWidth = 7 * this.scale;
	this.pavementWidth = 2 * this.scale;
	this.lineWidth = [this.scale * 3, this.scale * 9];
	this.buildingColor = d3.scale.linear()
		.domain(d3.range(0,1,1/7))
		.range(['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02', '#a6761d'])
	;
	this.deferUpdate = false;

	this.roads = new DCEL;
	this.pavements = new DCEL;
	this.buildings = new DCEL;
	this.buildingfaces = [];

	this.resize();
}

Plan.prototype.resize = function resize()
{
	this.width = domain[2] - domain[0];
	this.height = domain[3] - domain[1];
	this.svg
		.attr('width', this.width)
		.attr('height', this.height)
		.attr('viewBox', [
			domain[0], domain[1], this.width, this.height,
		].join(' '))
	;
	this.update();
	this.map.roads.style('stroke-width', this.roadWidth);
	this.map.roadlines.style('stroke-width', this.roadWidth / 16);
	this.map.roadlines.style('stroke-dasharray', [
		0,
		this.lineWidth[1] / 2,
		this.lineWidth[0],
		this.lineWidth[1] / 2,
		].join(','));
	this.map.pavements.style('stroke-width', this.pavementWidth);
	return this;
}

Plan.prototype.update = function update()
{
	updateRoads(this);
	updatePavements(this);
	updateBuildings(this);
	return this;
}

Plan.prototype.getValue = function getValue(x, y)
{
	if (DCEL.insideFaces(this.buildingfaces, x, y))
		return 0;
	if (this.pavements.closestEdge(x,y) <= this.pavementWidth / 2)
		return 1
	if (this.roads.closestEdge(x,y) <= this.roadWidth / 2)
		return .5;
	return .75;
}

Plan.prototype.getRaster = function getRaster()
{
	return this.getValue.bind(this);
}

Plan.prototype.drawRoad = function drawRoad(x1, y1, x2, y2)
{
	var n1 = this.roads.addNode(x1, y1),
		n2 = this.roads.addNode(x2, y2);
	this.roads.connectNodes(n1, n2);
	if (!this.deferUpdate)
		updateRoads(this);
	return this;
}

Plan.prototype.drawPavement = function drawPavement(x1, y1, x2, y2)
{
	var n1 = this.pavements.addNode(x1, y1),
		n2 = this.pavements.addNode(x2, y2);
	this.pavements.connectNodes(n1, n2);
	if (!this.deferUpdate)
		updatePavements(this);
	return this;
}

Plan.prototype.drawBuilding = function drawBuilding(x1, y1, x2, y2)
{
	var n1 = this.buildings.addNode(x1, y1),
		n2 = this.buildings.addNode(x2, y2);
	this.buildings.connectNodes(n1, n2);
	if (!this.deferUpdate)
	{
		this.buildingfaces = this.buildings.getFaces();
		updateBuildings(this);
	}
	return this;
}

Plan.prototype.clean = function clean()
{
	this.buildings.erode();
	if (!this.deferUpdate)
	{
		this.buildingfaces = this.buildings.getFaces();
		updateBuildings(this);
	}
	return this;
}

Plan.prototype.serialize = function serialize()
{
	return {
		domain: this.domain,
		scale: this.scale,
		roads: this.roads.edges
			.filter(function (e, i) { return i % 2; })
			.map(function (e) { return [e.node.x, e.node.y, e.twin.node.x, e.twin.node.y]; }),
		pavements: this.pavements.edges
			.filter(function (e, i) { return i % 2; })
			.map(function (e) { return [e.node.x, e.node.y, e.twin.node.x, e.twin.node.y]; }),
		buildings: this.buildings.edges
			.filter(function (e, i) { return i % 2; })
			.map(function (e) { return [e.node.x, e.node.y, e.twin.node.x, e.twin.node.y]; }),
	};
}

Plan.prototype.unserialize = function unserialize(data)
{
	var plan = this;
	Plan.call(this, this.svg.attr('id'), data.domain, data.scale);
	this.deferUpdate = true;
	data.roads.forEach(function (e) { plan.drawRoad.apply(plan, e); });
	data.pavements.forEach(function (e) { plan.drawPavement.apply(plan, e); });
	data.buildings.forEach(function (e) { plan.drawBuilding.apply(plan, e); });
	this.deferUpdate = false;
	this.buildingfaces = this.buildings.getFaces();
	return this.update();
}

//------------------------------------------------------------------------------

function updateRoads(plan)
{
	var path = '';
	for (var i =  plan.roads.edges.length - 2; i >= 0; i -= 2)
	{
		var edge = plan.roads.edges[i],
			n1 = edge.node,
			n2 = edge.twin.node;
		path += 'M' + n1.x + ',' + n1.y + 'L' + n2.x + ',' + n2.y;
	}
	plan.map.roads.attr('d', path);
	plan.map.roadlines.attr('d', path);
}

function updatePavements(plan)
{
	var path = '';
	for (var i =  plan.pavements.edges.length - 2; i >= 0; i -= 2)
	{
		var edge = plan.pavements.edges[i],
			n1 = edge.node,
			n2 = edge.twin.node;
		path += 'M' + n1.x + ',' + n1.y + 'L' + n2.x + ',' + n2.y;
	}
	plan.map.pavements.attr('d', path);
}

function updateBuildings(plan)
{
	var faces = plan.buildingfaces,
		buildings = plan.map.buildings.selectAll('polygon').data(faces);
	buildings.enter().append('polygon');
	buildings
		.attr('points', function (d) {
			return d.map(function (d) { return d.x + ',' + d.y; }).join(' ');
		})
		.style('fill', function (d) { return plan.buildingColor(faceHash(d)); })
	;
	buildings.exit().remove();

	var edgehash = {};
	for (var i = faces.length - 1; i >= 0; --i)
		for (var j = faces[i].length - 1, k = 0; j >= 0; k = j--)
			edgehash[edgeId(faces[i][j], faces[i][k])] = true;

	var path = '';
	for (var i =  plan.buildings.edges.length - 2; i >= 0; i -= 2)
	{
		var edge = plan.buildings.edges[i],
			n1 = edge.node,
			n2 = edge.twin.node;
		if (edgehash[edgeId(n1,n2)])
			continue;
		path += 'M' + n1.x + ',' + n1.y + 'L' + n2.x + ',' + n2.y;
	}
	plan.map.buildinglines.attr('d', path);
}

function nodeId(node)
{
	return '' + node.x + ',' + node.y;
}

function edgeId(n1, n2)
{
	n1 = nodeId(n1);
	n2 = nodeId(n2);
	return n1 < n2 ? (n1 + ';' + n2) : (n2 + ';' + n1);
}

function faceHash(face)
{
	var v = 0;
	for (var i = face.length - 1; i >= 0; --i)
		v = (v + face[i].x * 53 + face[i].y * 71) % 131;
	return v / 131;
}

//------------------------------------------------------------------------------

global.Plan = Plan;

})(window || this);

//------------------------------------------------------------------------------
