/**
 * Double connected edge list, datastructure for planar divisions
 * Ferry Timmers, April 2016, as MIT
 */

(function (global) {

//------------------------------------------------------------------------------

function DCEL()
{
	this.nodes = [];
	this.edges = []; // even and odd are always twins.

	this.nodeHash = {};
}

DCEL.prototype.addNode = function addNode(x, y)
{
	return add_node(this, x, y);
}

DCEL.prototype.connectNodes = function connectNodes(n1, n2)
{
	if (this.nodes[n1.index] == n1 && this.nodes[n2.index] == n2)
		connect(this, n1, n2);
	return this;
}

DCEL.prototype.connectNode = function connectNodes(n, e) // n must be on e
{
	if (this.nodes[n.index] == n && this.edges[e.index] == e)
		split(this, e, n);
	return this;
}

DCEL.prototype.removeEdge = function removeEdge(e)
{
	if (this.edges[e.index] != e)
		return this;

	disconnect(this, e);
	vacuum(this);
	return this;
}

DCEL.prototype.closestNode = function closestNode(x, y)
{
	var p = { x: x, y: y },
		min = Infinity,
		node = null;
	for (var i = this.nodes.length - 1; i >= 0; --i)
	{
		var d = dist2(p, this.nodes[i]);
		if (d < min)
		{
			min = d;
			node = this.nodes[i];
		}
	}
	return [node, Math.sqrt(min)];
}

DCEL.prototype.closestEdge = function closestEdge(x, y)
{
	var p = { x: x, y: y },
		min = Infinity
		point = null,
		edge = null;
	for (var i = this.edges.length - 2; i >= 0; i -= 2)
	{
		var q = proj(p, this.edges[i].node, this.edges[i].twin.node)
			d = dist2(p, q);
		if (d < min)
		{
			min = d;
			point = q;
			edge = this.edges[i];
		}
	}
	return [edge, point, Math.sqrt(min)];
}

DCEL.prototype.erode = function erode()
{
	var changed = true;
	while (changed)
	{
		changed = false;
		for (var i = 0; i < this.edges.length; ++i)
		{
			var edge = this.edges[i];
			if (edge.next == edge.twin)
			{
				disconnect(this, edge);
				changed = true;
				break;
			}
		}
		vacuum(this);
	}
	return this;
}

DCEL.prototype.getFaces = function getFaces()
{
	var queue = [],
		visited = new Array(this.edges.length),
		faces = [];

	for (;;)
	{
		// Find highest outer edge
		var top = Infinity,
			topedge = null;
		for (var i = this.edges.length - 2; i >= 0; i -= 2)
		{
			if (visited[i] || visited[i + 1]) continue;
			var edge = this.edges[i],
				d = Math.max(edge.node.y, edge.twin.node.y);
			if (d < top)
			{
				top = d;
				topedge = outer_twin(edge);
			}
		}
		if (!topedge)
			return faces;

		// Ignore outer edges and recurse on twins
		var edge = topedge;
		do
		{
			queue.push(edge.twin);
			visited[edge.index] = true;
			edge = edge.next;
		} while (edge != topedge);

		// For each edge in queue find and return loop and recurse on twins
		while (queue.length)
		{
			var edge = queue.pop();
			if (visited[edge.index]) continue;
			visited[edge.index] = true;
			var face = [],
				edge2 = edge;
			do
			{
				visited[edge2.index] = true;
				face.push(edge2.node);
				queue.push(edge2.twin);
				edge2 = edge2.next;
			} while (edge2 != edge);
			faces.push(face);
		}
	}
}

DCEL.insideFace = function insideFace(face, x, y)
{
	var inside = false,
		x1 = face[0].x,
		y1 = face[0].y,
		x2, y2;
	for (var i = face.length - 1; i >= 0 ; --i)
	{
		x2 = face[i].x;
		y2 = face[i].y;
		if ((y2 < y && y1 >= y || y1 < y && y2 >= y) && (x2 <= x || x1 <= x))
			if ((x2 + (y - y2) / (y1 - y2) * (x1 - x2) < x))
				inside = !inside;
		x1 = x2;
		y1 = y2;
	}
	return inside;
}

DCEL.insideFaces = function insideFaces(faces, x, y)
{
	for (var i = faces.length - 1; i >= 0; --i)
		if (DCEL.insideFace(faces[i], x, y))
			return true;
	return false;
}

//-----------------------------------------------------------------------------

function Node(x, y)
{
	this.x = x;
	this.y = y;
	this.edge = null; // One of the incident edges (only origin)
	this.index = -1; // DCEL index
}

function Edge(prev, twin, next, node)
{
	this.prev = prev;
	this.twin = twin;
	this.next = next;
	this.node = node;
	this.index = -1; // DCEL index
}

//-----------------------------------------------------------------------------

function add_node(dcel, x, y)
{
	x <<= 0;
	y <<= 0;
	var id = '' + x + ',' + y;
	if (id in dcel.nodeHash)
		return dcel.nodeHash[id];
	var node = new Node(x, y);
	node.index = dcel.nodes.length;
	dcel.nodes.push(node);
	dcel.nodeHash[id] = node;
	return node;
}

function remove_node(dcel, node)
{
	if (dcel.nodes.length > 1)
	{
		var n = node.index;
		dcel.nodes[n] = dcel.nodes[dcel.nodes.length - 1];
		dcel.nodes[n].index = n;
		delete dcel.nodeHash['' + node.x + ',' + node.y];
	}
	--dcel.nodes.length;
}

function add_edge(dcel, edge)
{
	edge.index = dcel.edges.length;
	dcel.edges.push(edge);
	edge.twin.index = dcel.edges.length;
	dcel.edges.push(edge.twin);
}

function remove_edge(dcel, edge)
{
	if (dcel.edges.length > 2)
	{
		var n = Math.min(edge.index, edge.twin.index);
		dcel.edges[n] = dcel.edges[dcel.edges.length - 2];
		dcel.edges[n].index = n;
		dcel.edges[n + 1] = dcel.edges[dcel.edges.length - 1];
		dcel.edges[n + 1].index = n + 1;
	}
	dcel.edges.length -= 2;
}

function vacuum(dcel)
{
	for (var i = 0; i < dcel.nodes.length; ++i)
		if (!dcel.nodes[i].edge)
			remove_node(dcel, dcel.nodes[i]);
}

function connect(dcel, n1, n2)
{
	var v12 = vect(n1, n2),
		p = [[0, n1],[1, n2]],
		edges = [];
	for (var i = 0; i < dcel.edges.length; i += 2)
		edges.push(dcel.edges[i]);
	while (edges.length)
	{
		var edge = edges.pop(),
			n3 = edge.node,
			n4 = edge.twin.node,
			v34 = vect(n3, n4),
			v13 = vect(n1, n3),
			d = cross(v12, v34),
			t1 = cross(v13, v34),
			t2 = cross(v13, v12);
		if (!d && !t1) // Collinear
		{
			var n = dot(v12, v12);
			t1 = dot(v13, v12) / n;
			t2 = plus(t1, dot(v34, v12) / n);
			if ((0 <= t1 && t1 <= 1) || (0 <= t2 && t2 <= 1))
			{
				disconnect(dcel, edge);
				p.push([t1, n3]);
				p.push([t2, n4]);
			}
			continue;
		}
		t1 /= d;
		t2 /= d;
		if (d && 0 < t1 && t1 < 1 && 0 < t2 && t2 < 1) // Intersection
		{
			
			var n5 = add_node(dcel, n1.x + v12.x * t1, n1.y + v12.y * t1);
			split(dcel, edge, n5);
			p.push([t1, n5]);
		}
	}
	p.sort(function (a, b) { return a[0] - b[0]; });
	for (var i = p.length - 2; i >= 0; --i)
		join(dcel, p[i + 1][1], p[i][1]);
}

function disconnect(dcel, edge)
{
	var other = edge.twin;
	if (edge.prev != other)
	{
		edge.node.edge = edge.prev.twin;
		edge.prev.next = other.next;
		other.next.prev = edge.prev;
		edge.prev = other;
		other.next = edge;
	}
	else
		edge.node.edge = null;

	if (edge.next != other)
	{
		other.node.edge = edge.next;
		edge.next.prev = other.prev;
		other.prev.next = edge.next;
		edge.next = other;
		edge.other = edge;
	}
	else
		other.node.edge = null;

	remove_edge(dcel, edge);
}

function split(dcel, edge, node)
{
	var e1 = new Edge(),
		e2 = new Edge(),
		e3 = new Edge(),
		e4 = new Edge();

	Edge.call(e1, edge.prev, e4, e2, edge.node);
	Edge.call(e2, e1, e3, edge.next == edge.twin ? e3 : edge.next, node);
	Edge.call(e3, edge.twin.prev, e2, e4, edge.twin.node);
	Edge.call(e4, e3, e1, edge.twin.next == edge ? e1 : edge.twin.next, node);

	edge.prev.next = e1;
	edge.next.prev = e2;
	edge.twin.prev.next = e3;
	edge.twin.next.prev = e4;

	add_edge(dcel, e1);
	add_edge(dcel, e2);
	remove_edge(dcel, edge);

	edge.node.edge = e1;
	edge.twin.node.edge = e3;
	node.edge = e2;
}

function join(dcel, node, other)
{
	if (node == other)
		return;

	var e1 = new Edge(),
		e2 = new Edge();

	e1.twin = e2;
	e2.twin = e1;
	e1.node = node;
	e2.node = other;

	if (!node.edge)
	{
		node.edge = e1;
		e1.prev = e2;
		e2.next = e1;
	}
	else
	{
		var left = left_edge(node, other).twin;
		e1.prev = left;
		e2.next = left.next;
		left.next.prev = e2;
		left.next = e1;
	}

	if (!other.edge)
	{
		other.edge = e2;
		e2.prev = e1;
		e1.next = e2;
	}
	else
	{
		var left = left_edge(other, node).twin;
		e2.prev = left;
		e1.next = left.next;
		left.next.prev = e1;
		left.next = e2;
	}

	node.edge = e1;
	other.edge = e2;
	add_edge(dcel, e1);
}

var TAU = Math.PI * 2;
function left_edge(node, other)
{
	var minAngle = Infinity,
		minEdge = node.edge,
		v = vect(node, other),
		edge = node.edge;
	do
	{
		var u = vect(node, edge.twin.node),
			angle = (Math.atan2(cross(u, v), dot(u, v)) + TAU) % TAU; // Clockwise
		if (angle <= minAngle)
		{
			minAngle = angle;
			minEdge = edge;
		}
		edge = edge.twin.next;
	} while (edge != node.edge);
	return minEdge;
}

function outer_twin(edge)
{
	n1 = edge.node,
	n2 = edge.twin.node;
	if (n1.x == n2.x)
		return (n1.y < n2.y) ? edge : edge.twin;
	return (n1.x < n2.x) ? edge : edge.twin;
}

//------------------------------------------------------------------------------

function vect(p1, p2)
{
	return { x: p2.x - p1.x, y: p2.y - p1.y };
}

function plus(v1, v2)
{
	return { x: v1.x + v2.x, y: v1.y + v2.y };
}

function dot(v1, v2)
{
	return v1.x * v2.x + v1.y * v2.y;
}

function cross(v1, v2)
{
	return v1.x * v2.y - v1.y * v2.x;
}

function dist2(p1, p2)
{
	var v = vect(p1, p2);
	return dot(v, v);
}

function proj(p, p1, p2)
{
	var u = vect(p1, p2),
		v = vect(p1, p),
		n = dot(u, u),
		t = dot(u, v) / n;
	if (!t) return n;
	t = Math.max(0, Math.min(t, 1));
	return { x: p1.x + u.x * t, y: p1.y + u.y * t };
}

function lineside(p, p1, p2)
{
	var u = vect(p1, p2),
		v = vect(p1, p);
	return Math.sign(cross(u,v));
}

//------------------------------------------------------------------------------

global.DCEL = DCEL;

})(window || this);

//------------------------------------------------------------------------------
