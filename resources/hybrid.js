/**
 * Hybrid visualisation of the ACO pheromone levels
 */

(function (global) {

//------------------------------------------------------------------------------

function Hybrid(id, aco)
{
	this.canvas = d3.select('#' + id);
	this.context = this.canvas.node().getContext('2d');
	this.aco = aco;

	this.particles = [];
	this.opacity = 1;
	this.color = d3.scale.linear()
		.domain([1, .75, .5, .25, 0])
		//.range(['#a63603', '#e6550d', '#fd8d3c', '#fdbe85', '#feedde'])
		.range(['#8c510a', '#bf812d', '#80cdc1', '#35978f', '#01665e'])
	;

	this.resize();
}

Hybrid.prototype.resize = function resize()
{
	var domain = this.aco.grid.domain,
		resolution = this.aco.grid.resolution;
	this.width = domain[2] - domain[0];
	this.height = domain[3] - domain[1];
	this.cellwidth = this.width / resolution[0];
	this.cellheight = this.height / resolution[1];
	this.canvas
		.attr('width', this.width)
		.attr('height', this.height)
	;
	this.redraw();
}

Hybrid.prototype.redraw = function redraw()
{
	// Fade out old paths
	this.context.globalAlpha = .97;
	this.context.globalCompositeOperation = 'copy';
	this.context.drawImage(this.canvas.node(), 0, 0);
	this.context.globalAlpha = this.opacity;
	this.context.globalCompositeOperation = 'source-over';
	this.context.lineCap = 'square';

	for (var i = this.particles.length - 1; i >= 0; --i)
	{
		var p = this.particles[i];

		// Particle is stuck, move it elsewhere
		if (!p.vx && !p.vy)
			p.setRandom(this.width, this.height);

		// Particle is off screen, move it elsewhere
		if (p.x < 0 || p.x >= this.width || p.y < 0 || p.y >= this.height)
			p.setRandom(this.width, this.height);

		// Particle is old, move it elsewhere
		if (p.age > 50)
		{
			p.setRandom(this.width, this.height);
			p.age = 0;
		}

		this.context.beginPath();
		this.context.moveTo(p.x, p.y);

		var cell = this.aco.grid.lookup(p.x, p.y),
			vx = 0,
			vy = 0,
			w = 0;
		for (var j = cell.edges.length - 1; j >= 0; --j)
		{
			var edge = cell.edges[j],
				neighbor = edge.v,
				ux = neighbor.x - cell.x,
				uy = neighbor.y - cell.y,
				trail = this.aco.globalTrails[edge.index];
			w = Math.max(w, trail);
			vx += ux * trail;
			vy += uy * trail;
		}
		var n = Math.sqrt(vx * vx + vy * vy);
		vx = (vx / n);
		vy = (vy / n);

		var w = Math.max(Math.min(w, 1), 0);
		this.context.strokeStyle = this.color(w);
		this.context.globalAlpha = Math.min(this.opacity, w);
		this.context.lineWidth = 2.5 + 1 / w;
		p.frame();
		this.context.lineTo(p.x, p.y);
		this.context.stroke();

		p.vx = (vx || 0) + p.vx * w / 2;
		p.vy = (vy || 0) + p.vy * w / 2;
		
		//p.vx += (Math.random() - 0.5);
		//p.vy += (Math.random() - 0.5);

		var n = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
		if (n > 10)
		{
			p.vx /= n * 10;
			p.vy /= n * 10;
		}
	}

	if (this.particles.length < 2000)
	{
		var particle = new Particle();
		particle.setRandom();
		this.particles.push(particle);
	}
	return this;
}

//------------------------------------------------------------------------------

function Particle(x, y)
{
	this.x = x;
	this.y = y;
	this.vx = 0;
	this.vy = 0;
	this.age = 0;
}

Particle.prototype.frame = function frame()
{
	this.x += this.vx;
	this.y += this.vy;
	++this.age;
	return this;
}

Particle.prototype.setRandom = function setRandom(width, height)
{
	this.x = width * Math.random();
	this.y = height * Math.random();
	return this;
}

//------------------------------------------------------------------------------

global.Hybrid = Hybrid;

})(window || this);

//------------------------------------------------------------------------------
