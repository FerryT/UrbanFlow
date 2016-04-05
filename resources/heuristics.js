/**
 * Heuristics - measures to aide ACO path decisions
 */

(function (global) {

//------------------------------------------------------------------------------

function Heuristic(func, edges, target, normalize)
{
	var heuristic = edges.map(function (edge)
	{
		return func(edge, target);
	});

	if (normalize)
	{
		var min = Infinity, max = -Infinity;
		for (var i = heuristic.length - 1; i >= 0; --i)
		{
			min = Math.min(min, heuristic[i]);
			max = Math.max(max, heuristic[i]);
		}
		var span = max - min;
		for (var i = heuristic.length - 1; i >= 0; --i)
			heuristic[i] = Math.max(
				(heuristic[i] - min) / span,
				Number.MIN_VALUE) || 0;
	}

	return heuristic;
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

function none(edges, target)
{
	return 1;
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

function simple_distance(edges, target)
{
	var x = (edge.u.x + edge.v.x) / 2,
		y = (edge.u.y + edge.v.y) / 2,
		vx = target.x - x,
		vy = target.y - y;
	return -Math.sqrt(vx * vx + vy * vy);
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

function cosine_distance(edge, target)
{
	var u = vect(edge.u, edge.v),
		v = vect(edge.u, target),
		n = norm(u) * norm(v),
		d = dot(u, v) / n;
	return Math.max((d + 1) / 2, Number.MIN_VALUE);
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

function obstruction_avoidance(edge, target)
{
	var closest = plan.buildings.closestEdge(edge.u.x, edge.u.y);
	if (!closest[0])
		return 1;
	var	u = vect(edge.u, edge.v),
		v = vect(closest[0].node, closest[0].twin.node),
		n = norm(u) * norm(v),
		d = Math.abs(dot(u, v) / n),
		c = Math.max(1 - (closest[2] / obstruction_avoidance.threshold), 0);
	return Math.max(c * d + (1 - c), Number.MIN_VALUE);
}

obstruction_avoidance.threshold = 40;

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

function map_intrinsic(edge, target)
{
	return edge.v.value;
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

function mix(edge, target)
{
	var cos = cosine_distance(edge, target),
		obs = obstruction_avoidance(edge, target),
		map = map_intrinsic(edge, target)
	return cos * obs * map;
}

//------------------------------------------------------------------------------

function vect(p1, p2)
{
	return { x: p2.x - p1.x, y: p2.y - p1.y };
}

function dot(v1, v2)
{
	return v1.x * v2.x + v1.y * v2.y;
}

function cross(v1, v2)
{
	return v1.x * v2.y - v1.y * v2.x;
}

function norm(v)
{
	return Math.sqrt(v.x * v.x + v.y * v.y);
}

function normal(v)
{
	var n = norm(v);
	return { x: y / n, y: -x / n };
}

function dist(p1, p2)
{
	return norm(vect(p1, p2));
}

//------------------------------------------------------------------------------

global.Heuristic = Heuristic;
global.Heuristic.none = none;
global.Heuristic.simple_distance = simple_distance;
global.Heuristic.cosine_distance = cosine_distance;
global.Heuristic.map_intrinsic = map_intrinsic;
global.Heuristic.obstruction_avoidance = obstruction_avoidance;
global.Heuristic.mix = mix;

})(window || this);

//------------------------------------------------------------------------------
