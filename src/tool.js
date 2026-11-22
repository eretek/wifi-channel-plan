/*! Eretek Online Araçlar #15 — Wi-Fi Kanal ve AP Yerleşim Taslağı */
ERT.def('15', {
	run: function (v, c) {
		var base = String(v.chans || '').split(/[,\s;]+/).filter(Boolean).map(function (x) { if (!/^\d+$/.test(x)) { throw c.fe('chans', 'badCh', { c: x }); } return +x; });
		if (!base.length) { throw c.fe('chans', 'req'); }
		if (v.band === '2.4') {
			if (v.width !== '20') { throw c.fe('width', 'w24'); }
			base.forEach(function (x) { if (x < 1 || x > 14) { throw c.fe('chans', 'badCh', { c: x }); } });
			for (var i = 0; i < base.length; i++) { for (var j = i + 1; j < base.length; j++) { if (Math.abs(base[i] - base[j]) < 5) { throw c.fe('chans', 'ovl24', { a: base[i], b: base[j] }); } } }
		} else {
			base.forEach(function (x) { if (x < 36 || x > 177 || (x - 36) % 4 && x < 149 || x >= 149 && (x - 149) % 4) { throw c.fe('chans', 'badCh', { c: x }); } });
		}
		var groups = base.map(function (x) { return [x]; });
		if (v.band === '5' && v.width !== '20') {
			var G = v.width === '40' ? [[36, 40], [44, 48], [52, 56], [60, 64], [100, 104], [108, 112], [116, 120], [124, 128], [132, 136], [140, 144], [149, 153], [157, 161], [165, 169], [173, 177]]
				: [[36, 40, 44, 48], [52, 56, 60, 64], [100, 104, 108, 112], [116, 120, 124, 128], [132, 136, 140, 144], [149, 153, 157, 161], [165, 169, 173, 177]];
			groups = G.filter(function (g) { return g.every(function (x) { return base.indexOf(x) !== -1; }); });
			if (!groups.length) { throw c.fe('chans', 'noGroup'); }
		}
		var names = [], adj = {};
		c.lines(v.aps, 500, 'aps').forEach(function (l, i) {
			var p = l.split(/[;:]/), ap = p[0].trim();
			if (!ap) { throw c.fe('aps', 'rowFmt', { r: i + 1 }); }
			if (!adj[ap]) { adj[ap] = new Set(); names.push(ap); }
			(p[1] || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (n) {
				if (n === ap) { return; }
				if (!adj[n]) { adj[n] = new Set(); names.push(n); }
				adj[ap].add(n); adj[n].add(ap);
			});
		});
		// DSatur: en çok farklı renkli komşusu olan, eşitlikte en yüksek dereceli düğüm önce
		var col = {}, left = names.slice();
		while (left.length) {
			left.sort(function (a, b) {
				var sa = new Set(Array.from(adj[a]).filter(function (n) { return col[n] !== undefined; }).map(function (n) { return col[n]; })).size;
				var sb = new Set(Array.from(adj[b]).filter(function (n) { return col[n] !== undefined; }).map(function (n) { return col[n]; })).size;
				return sb - sa || adj[b].size - adj[a].size || names.indexOf(a) - names.indexOf(b);
			});
			var n = left.shift(), used = {}, best = 0, bestCnt = Infinity;
			adj[n].forEach(function (m) { if (col[m] !== undefined) { used[col[m]] = (used[col[m]] || 0) + 1; } });
			for (var k = 0; k < groups.length; k++) { var u = used[k] || 0; if (u < bestCnt) { best = k; bestCnt = u; if (!u) { break; } } }
			col[n] = best;
		}
		var rows = [], cls = [], conflicts = [];
		names.forEach(function (n) {
			var bad = Array.from(adj[n]).filter(function (m) { return col[m] === col[n]; });
			if (bad.length) { conflicts.push(n); }
			rows.push([n, groups[col[n]].join('+'), Array.from(adj[n]).join(', ') || '–', bad.length ? c.t('clash', { l: bad.join(', ') }) : '✓']);
			cls.push(bad.length ? 'warn' : '');
		});
		var msgs = [conflicts.length ? ['warn', c.t('unsolved', { n: conflicts.length })] : ['ok', c.t('solved', { g: groups.length })], ['info', c.t('draft')]];
		var cols = [c.t('c_ap'), c.t('c_ch'), c.t('c_nb'), c.t('c_st')];
		var asg = {}; names.forEach(function (n) { asg[n] = groups[col[n]].join('+'); });
		return { big: c.t('big', { n: names.length, g: groups.length }), msgs: msgs, tables: [{ cols: cols, rows: rows, cls: cls }], x: { csv: { name: 'wifi-channel-plan', cols: cols, rows: rows } }, v: { assign: asg, conflicts: conflicts.length } };
	}
});
