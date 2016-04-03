/**
 * Heuristics - measures to aide ACO path decisions
 */

(function (global) {

//------------------------------------------------------------------------------

function Heuristic(func, edges, normalize)
{
	var heuristic = edges.map(function (edge)
	{
		return func(edge);
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
	return Heuristic(function (edge) { return 1; }, edges);
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

function simple_distance(edges, target)
{
	return Heuristic(function (edge)
	{
		var x = (edge.u.x + edge.v.x) / 2,
			y = (edge.u.y + edge.v.y) / 2,
			vx = target.x - x,
			vy = target.y - y;
		return -Math.sqrt(vx * vx + vy * vy);
	}, edges, true);
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

function cosine_distance(edges, target)
{
	return Heuristic(function (edge)
	{
		var v1x = target.x - edge.u.x,
			v1y = target.y - edge.u.y,
			v2x = edge.v.x - edge.u.x,
			v2y = edge.v.y - edge.u.y;
		if (v1x == 0 && v1y == 0)
			return 1;
		return (v1x*v2x + v1y*v2y) /
			(Math.sqrt(v1x*v1x + v1y*v1y) * Math.sqrt(v2x*v2x + v2y*v2y));
	}, edges, true);
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

function map_intrinsic(edges, target)
{
	return Heuristic(function (edge)
	{
		return edge.v.value;
	}, edges, false);
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

function mix(edges, target)
{
	var map = map_intrinsic(edges, target);
	return cosine_distance(edges, target).map(function (edge, i)
	{
		return edge * map[i];
	});
}

//------------------------------------------------------------------------------

global.Heuristic = Heuristic;
global.Heuristic.none = none;
global.Heuristic.simple_distance = simple_distance;
global.Heuristic.cosine_distance = cosine_distance;
global.Heuristic.map_intrinsic = map_intrinsic;
global.Heuristic.mix = mix;

})(window || this);

//------------------------------------------------------------------------------
