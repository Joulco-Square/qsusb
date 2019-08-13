//V1.5
$host = '';

var $devs = Array();
//$devs[0] = Object();
//$devs[0].id = '@111110';
//$devs[0].name = 'light';

var $devset = Array();
//$devset[0].id = "@xxxxxx"
//$devset[0].grp = "office"
//$devset[0].icon = "fan"

var $scenes = Array();
//$scenes[0].name = "Movie";
//$scenes[0].grp = "Home";
//$scenes[0].cmds[0] = "001122=00";&device

var $open = {};
var $layout = Array();
//$layout[0].name = "Upstairs"
//$layout[0].open = 0|1
//$layout[0].items[0] = "@xxxxxx" //dev 1
//$layout[0].items[1] = "Movie"  //scene1

var $scheds = Array();
var $refresh = false;
var $back_screen = null;
var $i = null;//for current selected device
var $sch_key=null;
var $callback=null;
var $dim=null;
var $last_screen='';
var $t='';
var $modal_cb=null;
var $cmds = null;
var $id=null;
var $usb_ok=true;
var $srv_ok=true;
function $(id) {return document.getElementById(id);}

function init()
{

	qs_init();
	setup_load();
	dev_list_get();
	layout_build();
	
	main_screen();
	sched_get();

	setInterval(function() {
		
		devs_refresh();
		if($refresh)main_screen();
		if($i)
		{
			if($('ago'))$('ago').innerHTML = time_ago($devs[$i].time);
		}
	}, 1000 * 60);

}
//-------------------------------
function setup_load()
{
	var ob = obj_load('qsmobile');

	if (ob) {
		$scenes = ob.scenes;
		$devset = ob.devset;
	}
	
	if($scenes==null)$scenes = Array();
	if($devset==null)$devset = Array();
	
}
//----------------------
function setup_save()
{
	var obj = {};
	obj.scenes = $scenes;
	obj.devset = $devset;
	if (obj_save('qsmobile', obj))return;
	//error
	console.log('ERROR SAVING');
}
//----------------------
function add()
{
	//SwitchArt_tx('@0a6f40','0000ff','aa');
	//return;
	
	var s = '<div class="item add_dev" onclick="dev_add()">New Device</div>';
	s += '<div class="item add_scn" onclick="scn_add()">New Scene</div>';
	s += '<div class="back" onclick="main_screen()">back</div>';
		
	$('main').innerHTML = s;
	$('title').innerHTML = 'Add ?';
	$refresh=false;
	window.scrollTo(0,0);
		
}
//------------------------
function top_click(event)
{
	if (!event)event = window.event;
	var target = event.target ? event.target : event.srcElement;

	if(target.id=='icon')
	{
		devs_refresh();
		return;
	}
	if($back_screen)$back_screen();
}
//---------------
function dev_add()
{
	$('main').innerHTML = $('dev_add').innerHTML;
	
	var s ='';
	for( var i in $layout)
	{
		s += '<option>' + $layout[i].name + '</option>';
	}
	$('sel_grp').innerHTML = s;
	$('title').innerHTML = 'New Device';
	window.scrollTo(0,0);
		
}
//-------------------------
function dev_add_click(ok)
{
	
	if (ok == 0) {
		if($i===null)main_screen();
		else dev_more();
		return;
	}

	var id = $('dev_id').value;
	if (id.charAt(0) != '@') {
		if (id.length != 6)
		{
			alert("Please enter a valid Device ID (eg. @01af10)");
			return;
		}
		id = '@' + id;
	}
	if (!isID(id))
	{
		alert("Please enter a valid Device ID (eg. @01af10)");
		return;
	}
	var n = $('dev_name').value;
	if (n == '')
	{
		alert("Please enter a Device Name");		
		return;
	}
	
	var grp = $('new_grp').value;
	if(grp=='')grp = $('sel_grp').value;

	
	var t = $('dev_type').value;
	if (t.length != 3) {
		alert('ERROR');
		return;
	}

	var r = qs_tx_sync($host + '/&device/' + id + '/' + t + '/' + n);
	//check r
	devs_refresh();
	var i = find_id(id);
	if(i!==null)//existing
	{
		var obj = {};
		obj.id = id;
		obj.grp = grp;
		devset_add(obj);
		setup_save();
		layout_build();
		
	}else {
		alert("Error Saving Device!");
	}
	if($i===null)main_screen();
	else dev_more();

}
//--------------------------------------
function main_screen()
{
	var s = '<div id="control" onclick="main_click(event)">';
	if($layout)
	{
		var items = $layout[0].items;
		for(var x in items )s += item_html(items[x]);

		for(var x=1; x<$layout.length;x++)
		{
			var n = $layout[x].name;
			if($open[n]==1)var c = "min";
			else var c = "plus";	
			s += '<div id="G' + x + '" class="grp ' + c + '" onclick="grp_toggle(this)">' + n + '</div>';
			if($open[n]==1)s += '<div class="">'
			else s += '<div class="hide">'
			var items = $layout[x].items;	
			for(var y in items)
			{
				s += item_html(items[y]);				
			}
			s += '</div>';
		}
	}	
	s += '<span class="addbut" onclick="add()">Add</span>';	
	s += '</dev>';

	$('main').innerHTML = s;
	$('title').innerHTML = 'QS Mobile';
	$('top_but').className = 'thide';

	$refresh = true;
	$i=null;
	$dim = null;	
}

function item_html(id)//id=@xxxxxx | scene name
{
	var t = id.charAt(0);

	if(t=='@')//dev
	{

		var i = find_id(id);
		if(i==null)return '';
		switch ($devs[i].type)
		{
			case 'rel':
				return list_rel(i);
			case 'dim':
				return list_dim(i);
			case 'tmp':
				return list_tmp(i);
			case 'art':
				return list_art(i);				
			case 'hum':
				return list_hum(i);	
		}
		return;
	}
	var i = find_scn(id);
	if(i==null)return '';	
	return list_scn(i); 
}
//------------
function grp_toggle(obj)
{
	var div = obj.nextSibling;
	var i = parseInt(obj.id.substr(1),10); 
	
	if(div.className == 'hide')
	{
		div.className = 'show';
		obj.className = 'grp min';
		var n = obj.innerHTML; 
		$open[n] = 1;
	}
	else {
		div.className = 'hide';
		obj.className = 'grp plus';
		var n = obj.innerHTML; 
		$open[n] = 0;
	}
	
}
//------------------------------

function list_dim(i)
{
	var v = legacy_status($devs[i].val);
	var c = state_class(v);
	var s = '';
	s += '<div id="' + $devs[i].id + '" class="' + c + '">';
	s += '<span class="pic"></span>';
	s += '<span class="name">' + $devs[i].name + '</span>';
	s += '<span class="more"></span>';
	s += '</div>';
	return s;
}

function list_rel(i)
{

	var v = legacy_status($devs[i].val);
	var c = state_class(v);
	var s = '';
	s += '<div id="' + $devs[i].id + '" class="' + c + '">';
	s += '<span class="pic"></span>';
	s += '<span class="name">' + $devs[i].name + '</span>';
	s += '<span class="more"></span>';
	s += '</div>';
	return s;
}

function list_tmp(i)
{
	var t = $devs[i].val;
	if (t.substr(0, 2) == '25' && t.length==8)//wizer
	{
		var ct = hexdec(t.substr(4, 2));
		ct = ct & 0x7f;
		t = ct + 'C';
	}
	if (t.substr(0,4) == '340c'){
		var c = hexdec(t.substr(4,4));
		c = Math.round(-6 + (125 * (c / Math.pow(2,16))));
		var d = hexdec(t.substr(8,4));
		d = Math.round(-46 + (175.72 * (d / Math.pow(2,16))));
		//var output = d.toString() + 'C 'c.toString() + '%'
		//console.log(output)
	}
	if (t)t = t.replace('C', '');
	var t_num = parseFloat(t)
	if (t_num > 90){
		t_num = -257 + t_num
		t = t_num.toString() + '&degC'
	}
	//console.log(t_num)
	//if (t)t = t.replace('C', '&degC');

	var s = '';
	s += '<div id="' + $devs[i].id + '">';
	s += '<span class="tpic"></span>';
	s += '<span class="name">' + $devs[i].name + '</span>';
	s += '<span class="more"></span>';
	s += '<span class="tval">' + t + '</span>';
	s += '</div>';
	return s;
}

function list_art(i)
{
	
	var s = '';
	s += '<div id="' + $devs[i].id + '">';
	s += '<span class="art_icon"></span>';
	s += '<span class="name">' + $devs[i].name + '</span>';
//	s += '<span class="tval">' + t + '</span>';
	s += '<span class="more"></span>';
	s += '</div>';
	return s;
}


function list_hum(i)
{
	var t = $devs[i].val;//[HW][SW][RHh][RHl][Th][Tl]
	//if (t.substr(0, 2) != '34')return; 

	var rh="";
	var tmp ="";
	if(t)
	{
		var rh = hexdec(t.substr(4, 4));
		rh = (-6 + (125*(rh/Math.pow(2,16))));
		rh = Math.round(rh) + '%';
		
		var tmp = hexdec(t.substr(8, 4));	
		tmp = (-46.85 + (175.72*(tmp/Math.pow(2,16))));		
		tmp = Math.round(tmp) + '&deg';
	}

	var s = '';
	s += '<div id="' + $devs[i].id + '">';
	s += '<span class="rhpic"></span>';
	s += '<span class="name">' + $devs[i].name + '</span>';
	s += '<span class="more"></span>';
	s += '<span class="tval">' + tmp + '</span>';
	s += '<span class="tval">' + rh + '</span>';
	s += '</div>';
	return s;
}


function list_scn(i)
{
	var s = '<div id="S' + i + '" class="star">';
	s += '<span class="pic"></span>';
	s += '<span class="name">' + $scenes[i].name + '</span>';
	s += '<span class="more"></span>';
	s += '</div>';	
	return s;
}

function main_click(event)
{
	// IE doesn't pass event into the parameter
	if (!event)event = window.event;
	var target = event.target ? event.target : event.srcElement;

	var id = target.id;
	if(id=='')
	{
		var t = target;
		while(id==''){
			t=t.parentNode;
			id = t.id;
		}
	}
	
	var c = id.charAt(0);
	if(c=='@')//dev
	{
		var i = find_id(id);
		if (i == null){
			alert("ID Error!");
			return;
		}
		
		if(target.className == 'more'){
			$refresh = false;
			$i = i;
			dev_more(i);
		}
		else {
			
			if($devs[i].type == 'tmp' || $devs[i].type == 'art' || $devs[i].type == 'hum')
			{
				$refresh = false;
				$i = i;
				dev_more(i);
				return;
			}
			dev_click(i);
		}
		return;	
	}
	
	if(c=='S')//scene
	{
		var i = parseInt(id.substr(1),10);
		if(target.className == 'more'){
			$refresh = false;
			$i = i;
			scn_more(i);
		}
		else scn_exec($scenes[i].cmds);
		return;
	}

}

function dev_click(i)
{
	var id = $devs[i].id;
	var pic = $(id);
	if (pic.className == '_na' || instr(pic.className,"_err"))var s = '=?';//get status
	else if (isON(i))var s = '=0';
	else var s = '=100';

	pic.className = 'spin';
	qs_tx($host + '/' + id + s, function(j)
	{

		if (j.cmd == 'ERROR')
			{
				pic.className = $devs[i].type + '_err';
				if(j.data == 'USB MODEM NOT CONNECTED')usb_err();
				return;
			}else
			{
				if (j.data == '')
				{
					if (s == '=0')$devs[i].val = 'OFF';
					else $devs[i].val = 'ON';

				}else
				{
					var str = j.data.split(',');
					$devs[i].val = str[0];
				}

				var c = state_class($devs[i].val);
				pic.className = c;
				usb_ok();
			}
	});

}
//----------------------------------
function dev_more()
{
	var dev = $devs[$i];
	var s = '<div class="device">';

	s += '<div class="dev_top">';	
	s += '<span id="rssi"></span>';
	s += '<span id="ago"></span>';
	s += '</div>';

	if(dev.type == 'tmp')
	{
		dev_tmp_screen();
		return;
	}
	
	if(dev.type == 'hum')
	{
		dev_tmp_screen();
		return;
	}
	
	if(dev.type == 'art')
	{
		art_screen();
		return;
	}	
	
	var o = legacy_status(dev.val);

	if (dev.type == 'rel')
	{
		var clson = '';
		var clsoff = '';
		if (o == 'ON')clson = 'on';
		else if (o == 'OFF')clsoff = 'on';

		s += '<div class="onoff" onclick="more_onoff_click(event)">';
		s += '<span class="bordr ' + clson + '">ON</span><span class="' + clsoff + '">OFF</span></div>';
	}else if (dev.type == 'dim')
	{
		var clson = 'on';
		if(o=='0%')clson='';
		s += '<span id="dim_but" class="' + clson + '" onclick="dim_select(dim_select_tx)">' + o + '</span>';
	}

	s += '<span id="off_timer" class="but1" onclick="off_timer_modal()">Delay Off</span>';
	s += '<span class="but1" onclick="dev_sched_screen()">Schedules</span>';
	s += '<span class="but1" onclick="dev_info_screen()">Info</span>';
	s += '<div class="but1" onclick="dev_edit()">Edit Device</div>';	
	s += '<div class="del_but" onclick="dev_del()">Delete Device</div>';	
	s += '<div class="back" onclick="main_screen()">Back</div>';

	$('main').innerHTML = s;
	$('title').innerHTML = dev.name;

	window.scrollTo(0,0);
	$back_screen = main_screen;
	$('top_but').className = 'tback';

	if($devs[$i].rssi)$('rssi').innerHTML = $devs[$i].rssi;	
	if($devs[$i].time)$('ago').innerHTML = time_ago($devs[$i].time);	

}
//--------------------------
function dev_edit()
{
	$('main').innerHTML = $('dev_add').innerHTML;
	
	$('dtype').className = "hide";
	
	$('dev_id').value = $devs[$i].id;
	$('dev_id').readOnly = true;
	$('dev_name').value = $devs[$i].name;
	
	$('sel_grp').innerHTML = option_groups();
	$('title').innerHTML = 'Edit Device';
	window.scrollTo(0,0);
	
	var g = layout_find_grp($devs[$i].id);
	$('sel_grp').selectedIndex = g;	
	
	select_val($('dev_type'),$devs[$i].type);
}
//----------------------------
function select_val(obj,val)
{
	var op = obj.options;
	for(var x=0;x<op.length;x++)
	{
		if(op[x].value==val)
		{			
			obj.selectedIndex = x;
			return x;
		}		
	}
	return null;
}
//--------------------------------
function dev_del()
{
	var r = confirm("Delete " + $devs[$i].name + '?');
	if (r == false)return;

	var r = qs_tx_sync($host + '/&device/' +  $devs[$i].id + '-');

	if (r.indexOf('DELETE'))
	{
		scn_remove_device($devs[$i].id);
		devset_clean();
	}
	else alert('ERROR DELETING DEVICE');
	
	devs_refresh();
	layout_build();
	main_screen();
}
//----------------------------
function layout_find_grp(item)
{	
	for(var x in $layout)
	{
		for(var y in $layout[x].items)
		{
			if($layout[x].items[y]==item)return x;
		}
	}		
	return null;	
}
function layout_build()
{
	$layout = Array();
	$layout[0]={"name":"","items":[]}
	var save = false;
	
	for(var i in $scenes)
	{
		
		var g = $scenes[i].grp;
		if(g==null)g='';
		
		if(g=='')
		{
			$layout[0].items.push($scenes[i].name);
		}
		else {
			var x = find_grp(g);
			if(x)$layout[x].items.push($scenes[i].name);
			else
			{
				$layout.push({"name":g,"items":[$scenes[i].name]});
			}
		}
	}

	for(var i in $devs)
	{
		var di = find_devset($devs[i].id);
		if(di===null)
		{
			var obj = {};
			obj.id = $devs[i].id;
			obj.grp = '';
			di = devset_add(obj);
			save=true;
		}
		var obj = $devset[di];
				
		if(obj.grp=='')
		{
			$layout[0].items.push(obj.id);
		}
		else {
			var x = find_grp(obj.grp);
			if(x)$layout[x].items.push(obj.id);
			else//new group
			{
				$layout.push({"name":obj.grp,"items":[obj.id]});
			}
		}
	}
	if(save)setup_save();
	
}

function devset_clean()
{
	for(var i in $devset)
	{		
		if(find_id($devset[i].id)==null)$devset.splice(i,1);
	}
}

function devset_add(obj)
{
	var i = find_devset(obj.id);
	if(i===null)return $devset.push(obj)-1;//add
	//edit
	$devset[i] = obj;
	return i;	
}

function dim_select_tx()//callback after dim select
{
	if($dim==null)//cancel
	{
		modal_hide();
		window.scrollTo(0,0);
		return;
	}

	var v = $dim.slice(0, -1);
	var s = $host + '/' + $devs[$i].id + '=' + v ;

	modal_hide();
	window.scrollTo(0,0);	
	$('dim_but').innerHTML = '';	
	$('dim_but').className = 'spin_c';
	
	qs_tx(s,function(j){
		
			if(j.cmd=='ERROR')
			{
				$dim='';
				$devs[$i].val='';
				$('dim_but').innerHTML = 'Error';	
				$('dim_but').className = 'err';
				
			}else 
			{				
				$devs[$i].val=$dim;
				$devs[$i].rssi = j.rssi;
				$devs[$i].time = Now();
				$('dim_but').innerHTML = $dim;	
				if($dim=='0%')$('dim_but').className = '';
				else $('dim_but').className = 'on';
				$('ago').innerHTML = time_ago($devs[$i].time);
			}

		});
}
//---------------------
function off_timer_modal()
{
	var s='';
	s += '<div id="mlist" onclick="off_timer_click(event)">';
	s += '<div>1min</div>';
	s += '<div>5min</div>';
	s += '<div>10min</div>';
	s += '<div>30min</div>';
	s += '<div>1hr</div>';
	s += '<div>2hr</div>';
	s += '<div>6hr</div>';
	s += '<div>12hr</div>';
	s += '<div>24hr</div>';
	s += '<div class="red">Cancel</div>';
	s += '</div>';
	modal_show(s);
}
//-----
function off_timer_click(event)
{
	if (!event)event = window.event;
	var target = event.target ? event.target : event.srcElement;	
	if(target.innerHTML=='Cancel'){
		modal_hide();
		return;
	}
	
	var t = target.innerHTML;
	if(instr(t,'min'))var sec = parseInt(t,10) * 60;
	else var sec = parseInt(t,10) * 3600;//hr
	if(sec==NaN)return;

	$('mpage').innerHTML = '';	
	$('mpage').className = 'spin_c';		

	qs_tx($host + '/' + $devs[$i].id + '+' + sec, function(j){
		
			modal_hide();
			if(j.cmd=='ERROR')
			{
				$('off_timer').style.color = 'red';
				
			}else 
			{				
				$devs[$i].rssi = j.rssi;
				$devs[$i].time = Now();
				if($devs[$i].type=='rel')$devs[$i].val = 'ON';
				else $devs[$i].val = '100%';
				dev_more();
				$('off_timer').style.color = 'green';
				
			}
		});
}
//----------------------
function dev_tmp_screen()
{
	var dev = $devs[$i];

	var t="";
	if(dev.time)
	{
		var i = parseInt(dev.time,10);
		t = time_ago(i);
	}

	var s = '<div class="page">';
	s += '<div class="info"><div>ID:</div><span>' + dev.id + '</span></div>';
	s += '<div class="info"><div>Signal:</div><span>' + dev.rssi + '</span></div>';
	s += '<div class="info"><div>Last Update:</div><span>' + t + '</span></div>';
	s += '<div class="but1" onclick="dev_edit()">Edit Device</div>';	
	s += '<div class="del_but" onclick="dev_del()">Delete Device</div>';	
	s += '<div class="back" onclick="main_screen()">Back</div>';
	s += '</div>';

	$('main').innerHTML = s;
	$('title').innerHTML = dev.name;

	window.scrollTo(0,0);
	$back_screen = main_screen;
	$('top_but').className = 'tback';
	
}

//-----------------------------------
function art_screen()
{
	var dev = $devs[$i];

	var s = '<div class="page">';
	s += '<div class="info"><div>ID:</div><span>' + dev.id + '</span></div>';
//	s += '<div class="info"><div>Signal:</div><span>' + dev.rssi + '</span></div>';
//	s += '<div class="info"><div>Last Update:</div><span>' + t + '</span></div>';
	

	s += '<div id="led_msg">Set LED Color</div>';
	s += '<canvas id="colpick" width="780" height="60" onclick="art_color_click(event)"></canvas>';
	s += '<div id="btxt">Brightness - 100%</div>';
	s += '<div id="bright"><input id="bval" type="range" min="0" max="100" value="100" onChange="art_slide_change(this)" onMouseup="art_slide_up(this)"/></div>';	
	
	s += '<div id="art"></div>';		
	s += '<div id="art_save" class="but1" onclick="art_save()">Save Color to Switch</div>';
		
	s += '<div class="but1" onclick="dev_edit()">Edit Device</div>';	
	s += '<div class="del_but" onclick="dev_del()">Delete Device</div>';	
	s += '<div class="back" onclick="main_screen()">Back</div>';
	s += '</div>';

	$('main').innerHTML = s;
	$('title').innerHTML = dev.name;

	window.scrollTo(0,0);
	$back_screen = main_screen;
	$('top_but').className = 'tback';
	
	art_canvas_fill($('colpick'));
	
}

function art_slide_change(t)
{
	$("btxt").innerHTML = "Brightness - " + t.value + "%";	
}

function art_slide_up(t)
{
	$('art_save').innerHTML = "Save Color to Switch";	
	$('art_save').style.color = '#777';	
	$bval = $('bval').value/100;
	art_tx_color();
}

function art_canvas_fill(canvas)
{
		
    var context = canvas.getContext('2d');
    context.rect(0, 0, canvas.width, canvas.height);

      // add linear gradient
    var grd = context.createLinearGradient(0, 0, canvas.width, canvas.height);

// red, green, blue, purple, orange);
    grd.addColorStop(0, 'red');   
//	grd.addColorStop(.2, 'orange');
	grd.addColorStop(.2, 'yellow');
	grd.addColorStop(.4, 'green');
	grd.addColorStop(.6, 'blue');		
	grd.addColorStop(.8, 'purple');	
	grd.addColorStop(1, 'white');	
    context.fillStyle = grd;
    context.fill();
}

$rgb = {};
$bval = 1;
function art_color_click(e)
{

	if(!e)e = window.event;
	var target = e.target ? e.target : e.srcElement;
	
	if (e.pageX || e.pageY) {
        posx = e.pageX;
        posy = e.pageY;
	}
	else if (e.clientX || e.clientY) {
        posx = e.clientX + document.body.scrollLeft
                + document.documentElement.scrollLeft;
        posy = e.clientY + document.body.scrollTop
                + document.documentElement.scrollTop;
	}
		
	var x = posx - target.offsetLeft;
	var y = posy - target.offsetTop;	
	var p = target.getContext('2d').getImageData(x, y, 1, 1).data;
	//console.log(p[0] + ',' + p[1] + ',' + p[2]);
	$rgb = p;

	$('art_save').innerHTML = "Save Color to Switch";	
	$('art_save').style.color = '#777';	
	
	art_tx_color();

}

function art_save()
{
	if($rgb[0]==undefined)return;
	
	var rgb = art_rgb_string();
	
	var c = $devs[$i].id + "00400305" + rgb;
	
	qs_tx($host + '/' + c, function(j)
	{
		if (j.cmd == 'ERROR')
			{
				if(j.data == 'USB MODEM NOT CONNECTED')
				{
					usb_err();
					return;
				}
				if (j.data == 'NO REPLY')
				{	
					usb_ok();
					$('art_save').innerHTML = "Error";	
					$('art_save').style.color = 'red';
				}

			}else
			{
				console.log("OK");
				usb_ok();
				$('art_save').innerHTML = "Saved";	
				$('art_save').style.color = 'Green';
			}
	});

	
	
	
}

function art_rgb_string()
{
	var r = parseInt($rgb[0]*$bval);
	var g = parseInt($rgb[1]*$bval);
	var b = parseInt($rgb[2]*$bval);
		
	var rgb = dechex(r) + dechex(g) + dechex(b);
	console.log(rgb);	
	return rgb;	
}

//-------------------------------------
function art_tx_color()
{
	
	var rgb = art_rgb_string();
	$('art').style.borderColor = 'rgba('+ $rgb[0] + ',' + $rgb[1] + ',' + $rgb[2] + ',' + $bval + ')';	
	$('led_msg').innerHTML = "Set LED Color";
	$('led_msg').className = '';
	
	var c = $devs[$i].id + "00401100" + rgb + 'ff';
	
	qs_tx($host + '/' + c, function(j)
	{
		if (j.cmd == 'ERROR')
			{
				if(j.data == 'USB MODEM NOT CONNECTED')
				{
					usb_err();
					return;
				}
				if (j.data == 'NO REPLY')
				{	
					usb_ok();
					console.log("ERR");
					$('led_msg').innerHTML = "Set LED Color - Error";	
					$('led_msg').className = 'red';
				}

			}else
			{
				console.log("OK");
				usb_ok();
				$('led_msg').innerHTML = "Set LED Color - Done";
				$('led_msg').className = 'grn';		
			}
	});

	
	
	
	
}

//-------------------------------------------
function more_onoff_click(event)
{
	if (!event)event = window.event;
	var target = event.target ? event.target : event.srcElement;

	var o = '0';
	if (target.innerHTML == 'ON')o = '100';

	qs_tx($host + '/' + $devs[$i].id + '=' + o, function(j)
	{

		if (j.cmd == 'ERROR')alert('NO REPLY!');
		else {
			var v = legacy_status(j.data);
			
			var b_on = target.parentNode.childNodes[0];
			var b_off = target.parentNode.childNodes[1];
			if (v.indexOf('ON') >= 0) {
				b_on.className = 'bordr on';
				b_off.className = '';
				$devs[$i].val = 'ON';
			}else
			{
				b_on.className = 'bordr';
				b_off.className = 'on';
				$devs[$i].val = 'OFF';
			}
			
			$devs[$i].rssi = j.rssi;
			$devs[$i].time = Now();
			$('rssi').innerHTML = $devs[$i].rssi;	
			$('ago').innerHTML = time_ago($devs[$i].time);	
			
		}

	});
}
//----------------------------
function dev_list_get()
{
	s = qs_tx_sync($host + '/&device');	
	var obj = JSON.parse(s);
	if (obj)$devs = obj;

}
//----------------------------
function dev_info_screen()
{
	var dev = $devs[$i];	

	qs_tx($host + '/' + dev.id + '=?',function(j){
		
		if(j.cmd=='ERROR')
		{
			$('stat').innerHTML = "ERROR: " + j.data;			
			$('stat').className = "err";			
			return;
		}

		if(j.data.indexOf(',')>-1)
		{
			var arr =  j.data.split(',');
			var type = arr[1];
			var fw = arr[2];
		}else
		{
			var type = '?';
			var fw = '?';
			if(j.data.length==6){
				var hw = j.data.substr(0,2);
				if(hw=='02')type = 'RX1-REL';
				else if(hw=='01')type = 'RX1-DIM';
				fw = hexdec(j.data.substr(2,2));
			}
				
		}

		var s = '<div class="page">';
		s += '<div class="info"><div>ID:</div><span>' + dev.id + '</span></div>';
		s += '<div class="info"><div>Model:</div><span>' + type + '</span></div>';
		s += '<div class="info"><div>Firmware:</div><span>' + fw + '</span></div>';
		s += '<div class="info"><div>Signal:</div><span>' + dev.rssi + '</span></div>';
		s += '<div class="but1" onclick="status_time_read()">Read Status Time</div>';
		s += '<div class="but1" onclick="status_time_save()">Change Status Time</div>';
		s += '<div class="back" onclick="dev_more()">Back</div>';
		s += '</div>';	
		$('main').innerHTML = s;			
		
	});

	var s = '<div class="page">';
	s += '<div id="stat" class="spin_c" style="line-height: 240px; height: 200px">Fetching...</div>';
	s += '<div class="back" onclick="dev_more()">Back</div>';
	s += '</div>';		
	$('main').innerHTML = s;
	window.scrollTo(0,0);
	$back_screen = dev_more;

}
//---------------------
function dev_sched_screen()
{
	var l = $scheds.length;
	var id = $devs[$i].id;
	var st;
	$dim=null;
	
	var s = '<div class="page">';
	s += '<div class="addbut" onclick="dev_sched_add()">Add Schedule</div>';
	s += '<div id="sched">';

	for (var i = 0; i < l; i++)
	{
		if(inarray(id, $scheds[i].cmd)==false)continue;
		
		var st_cls='';
		var t = $devs[$i].type;
				
		var o = $scheds[i].cmd[0].slice(8); 		
				
		if(t=='rel')
		{
			if(o=='0')st='OFF';
			else {st = 'ON';st_cls='on';}
		}else if(t=='dim')
		{
			st = o + '%';
			if(o!='0')st_cls='on';
		}
		
		var k = parseInt($scheds[i].key,10);
		s += '<div onclick="sched_edit_del(event,' + k + ')">';
		s += '<span class="sch_time">' + $scheds[i].time;
		s += '<span class="sch_days">' + sched_days_info($scheds[i].days) + '</span>';
		s += '</span>';
		s += '<span class="del"></span>';
		s += '<span class="output ' + st_cls + '">' + st + '</span>';
		
		s += '</div>';
	}
	s += '</div>';
	s += '<div class="back" onclick="dev_more()">Back</div>';
	s += '</div>';

	$('main').innerHTML = s;
	$back_screen = dev_more;

}
//------------------------
function sched_days_info(days)
{
	var s = '';

	if (days.charAt(0) == 'S')s += '<span class="bold">Su</span>';
	else s += '<span>Su</span>';
	if (days.charAt(1) == 'M')s += '<span class="bold">Mo</span>';
	else s += '<span>Mo</span>';
	if (days.charAt(2) == 'T')s += '<span class="bold">Tu</span>';
	else s += '<span>Tu</span>';
	if (days.charAt(3) == 'W')s += '<span class="bold">We</span>';
	else s += '<span>We</span>';
	if (days.charAt(4) == 'T')s += '<span class="bold">Th</span>';
	else s += '<span>Th</span>';
	if (days.charAt(5) == 'F')s += '<span class="bold">Fr</span>';
	else s += '<span>Fr</span>';
	if (days.charAt(6) == 'S')s += '<span class="bold">Sa</span>';
	else s += '<span>Sa</span>';

	return s;
}
//-----
function dev_sched_add()
{
	$sch_key = null;
	$('main').innerHTML = $('sched_screen').innerHTML;
	
	if($devs[$i].type == 'dim')
	{
		 $('sched_output').childNodes[1].innerHTML = '0%';		
	}
	$back_screen = dev_sched_screen;
}
//------------------
function sched_edit_del(event,k)//edit or del
{
	if (!event)event = window.event;
	var target = event.target ? event.target : event.srcElement;
		
	if(target.className=='del')
	{	
		var r = confirm("Delete Schedule ?");
		if(r==false)return;
		console.log(k);
		k = ("00" + k).slice(-3);//pad
		var s = qs_tx_sync('/&cron/' + k + '-');
		console.log(s);
		sched_get();//reload
		dev_sched_screen();
		return;
	}
	//edit sched	
	
	var i = sched_find_key(k);
	if(i==null)return;
	$sch_key = k;
	$sch_cur = $scheds[i];

	$('main').innerHTML = $('sched_screen').innerHTML;
	
	var t = $sch_cur.time;
	$('hours').value = t.slice(0,2);
	$('mins').value = t.slice(3);	
	
	var dow = $('dow');
	var d = $sch_cur.days;
	
	if(d.charAt(0)=='S')dow.childNodes[1].className='sel';
	if(d.charAt(1)=='M')dow.childNodes[2].className='sel';
	if(d.charAt(2)=='T')dow.childNodes[3].className='sel';
	if(d.charAt(3)=='W')dow.childNodes[4].className='sel';
	if(d.charAt(4)=='T')dow.childNodes[5].className='sel';
	if(d.charAt(5)=='F')dow.childNodes[6].className='sel';	
	if(d.charAt(6)=='S')dow.childNodes[7].className='sel';
	
	var cmd = $sch_cur.cmd[0].slice(8);
	
	if($devs[$i].type=='rel')
	{
		if(cmd=='0')
		{
			$('sched_output').childNodes[1].innerHTML='OFF';
		}else {
			$('sched_output').childNodes[1].innerHTML='ON';
			$('sched_output').childNodes[1].className='output on';				
		}
	}else if($devs[$i].type=='dim')
	{
		$('sched_output').childNodes[1].innerHTML= cmd + '%';
		if(cmd!='0')$('sched_output').childNodes[1].className='output on';
	}				
	

	$back_screen=null;
	
}

function dim_select(callback)
{
	$callback = callback;
	var s='';
	s += '<div id="mlist" onclick="dim_select_click(event)">';
	s += '<div>100%</div>';
	s += '<div>90%</div>';
	s += '<div>80%</div>';
	s += '<div>70%</div>';
	s += '<div>60%</div>';
	s += '<div>50%</div>';
	s += '<div>40%</div>';
	s += '<div>30%</div>';
	s += '<div>20%</div>';
	s += '<div>10%</div>';
	s += '<div>0%</div>';
	s += '<div class="red">Cancel</div>';
	s += '</div>';
	modal_show(s);
		
}
//----------
function dim_select_click(event)
{
	if (!event)event = window.event;
	var target = event.target ? event.target : event.srcElement;	
	if(target.innerHTML=='Cancel')$dim = null;
	else $dim = target.innerHTML;
	if($callback)$callback();
}
//----------------------
function time_focus(tbox)
{
	tbox.value="";
}
function time_blur(tbox,max)
{
	if(tbox.value=="")tbox.value="00";
	if(parseInt(tbox.value,10)>max)tbox.value = "00";
}

function time_press(tbox)
{
	tbox.value = tbox.value.substr(0,2);
}
function sched_day_click(event)
{
	if (!event)event = window.event;
	var target = event.target ? event.target : event.srcElement;	
	
	if(target.className=='')target.className = 'sel';
	else target.className='';
}
//---------------------
function sched_done_click(event)
{
	if (!event)event = window.event;
	var target = event.target ? event.target : event.srcElement;	

	if(target.innerHTML=='Cancel')
	{
		dev_sched_screen();
		return;	
	}
	
	var h = parseInt($('hours').value,10);
	var m = parseInt($('mins').value,10);
	
	if(isNaN(h) || isNaN(m))return;
	
	if(h<10)h = '0' + h;
	if(m<10)m = '0' + m;
	
	var dow = $('dow');
	
	var days = 0;
	var s = '';
	if(dow.childNodes[1].className=='sel'){s+='S';days=1;}
	else s+='s';
	if(dow.childNodes[2].className=='sel'){s+='M';days=1;}
	else s+='m';
	if(dow.childNodes[3].className=='sel'){s+='T';days=1;}
	else s+='t';
	if(dow.childNodes[4].className=='sel'){s+='W';days=1;}
	else s+='w';
	if(dow.childNodes[5].className=='sel'){s+='T';days=1;}
	else s+='t';
	if(dow.childNodes[6].className=='sel'){s+='F';days=1;}
	else s+='f';
	if(dow.childNodes[7].className=='sel'){s+='S';days=1;}
	else s+='s';
	
	if(days==0){
		alert("Please Select the days");
		return;
	}
		
	var o='';
	var output = $('sched_output').childNodes[1].innerHTML;
	
	if(output=="ON")o="100";
	else if(output=="OFF")o="0";
	else if(output=="0%")o="0";
	else o = output.slice(0,-1);

	if($sch_key==null)
	{
		//var key =  $scheds.length+1;		
		for(var i=1;i<100;i++)
		{
			if(find_sched_key(i)==-1)
			{
				var key=i;
				break;
			}
		}
	}
	else var key = $sch_key;
	
	var u = '/&cron/' + ("00" + key).slice(-3) + '/' + s + '/' + h + ':' + m + '/' + $devs[$i].id + '=' + o;
	var r = qs_tx_sync(u);
	
	sched_get();//reload
	dev_sched_screen();
	
}
function sched_find_key(k)
{
	var l = $scheds.length;
	for(var i = 0; i < l; i++)
	{
		if(k == parseInt($scheds[i].key,10))return i;
	}
	return null
}
//----------------------
function devs_refresh()
{
	s = qs_tx_sync($host + '/&device');
	var obj = JSON.parse(s);
	if (obj)
	{
		$devs = obj;
		return true;
	}
	return false;
}
//----------------------
function sched_get()
{
	var j = qs_tx_sync('/&cron');
	$scheds = JSON.parse(j);	
}
function scn_exec(c)
{
	if(c)
	{
		$cmds = c;
		$i=0;
		
		var s = '<div id="scn_exec" onclick="modal_hide()">';
		for(var i in c)
		{
			var idx = find_id(c[i].substr(0,7));
			s += '<div id="' + $devs[idx].id + 's">' + $devs[idx].name + '</div>';
		}
		s += '</div>';
		modal_show(s);				
	}
	
	var curid = $cmds[$i].substr(0,7);
	$( curid + 's').className = "spin";
	qs_tx($host + '/' + $cmds[$i++], function(j)
	{	
		if(j.cmd=='ERROR')
		{
			$(curid + 's').className = "dim_err";
			if(j.id=='')usb_err();
		}else
		{								
			$(j.id + 's').className = state_class(j.data);	
			usb_ok();			
		}

		if($i<$cmds.length)setTimeout("scn_exec()",100);//do again
		else {
				$i=null;
				devs_refresh();
				main_screen();
				setTimeout("modal_hide()",2000);//do again
			}
	});		
}
//------------------------------
function scn_more(i)
{
	$('main').innerHTML = $('scn_screen').innerHTML;
	$('scn_name').value = $scenes[i].name;
	
	var s="";
	var c = $scenes[i].cmds;
	for(var x=0;x<c.length;x++)
	{
		var id = c[x].substr(0,7);
		var idx = find_id(id);
		if(idx==null)continue;
		
		var val = c[x].substr(8);
		s += scn_dev_html(idx,parseInt(val,10));
		
	}
	$('scn_list').innerHTML = s;
	s = '<div class="del_but" onclick="scn_del()">Delete Scene</div>';
	s += '<div class="back" onclick="scn_done_click()">Back</div>';
	$('scn_done').innerHTML = s; 
	$('sel_grp').innerHTML = option_groups();
	select_val($('sel_grp'),$scenes[$i].grp);

	$('title').innerHTML = 'Scene';
	$back_screen = main_screen;
	$('top_but').className = 'tback';
	
	window.scrollTo(0,0);
	$scn_save = 0;
	$modal_cb = scn_add_device;
}
function scn_add()
{
	$('main').innerHTML = $('scn_screen').innerHTML;
	$('title').innerHTML = 'New Scene';
	$('sel_grp').innerHTML = option_groups();
	$i=null;
	$modal_cb = scn_add_device;
}
//-----------------
function scn_del()
{
	var r = confirm("Delete " + $scenes[$i].name + ' Scene ?');
	if (r == false)return;

	$scenes.splice($i,1);
	setup_save();
	layout_build();
	main_screen();
}
//--------------------------
function scn_control_click(event)
{
	if (!event)event = window.event;
	var target = event.target ? event.target : event.srcElement;	
	
	if($('scn_list').innerHTML=="")return;
		
	if(target.innerHTML=="All OFF")
	{
		var cmds = scn_list_to_arr($('scn_list'));
		for(var x in cmds)cmds[x] = cmds[x].substr(0,8) + '0';
		scn_exec(cmds);
		return;
	}

	if(target.innerHTML=="Execute")
	{
		var cmds = scn_list_to_arr($('scn_list'));
		scn_exec(cmds);
		return;
	}
	
	if(target.innerHTML=="All ON")
	{
		var cmds = scn_list_to_arr($('scn_list'));
		for(var x in cmds)cmds[x] = cmds[x].substr(0,8) + '100';
		scn_exec(cmds);		
		return;
	}	
	
}

function scn_add_device(i)
{
	$('scn_list').innerHTML += scn_dev_html(i,0);

}

function scn_done_click()
{

	var n = $('scn_name').value;
	if(n=='')return;
	
	var sl = $('scn_list');
	if(sl.innerHTML=="")return;
	
	var scn = {};
	scn.name = n;
	scn.cmds = scn_list_to_arr(sl);
	
	var grp = $('new_grp').value;
	if(grp=='')grp = $('sel_grp').value;
	scn.grp = grp;

	if($i===null)//new
	{
		$scenes.push(scn);
		setup_save();
		layout_build();
	}
	else {

		if(!scn_match($scenes[$i],scn))
		{
			$scenes[$i] = scn;
			setup_save();
			layout_build();
		}
	}
	
	main_screen();
	
}
//------------
function scn_match(s1,s2)
{
	if(s1.name != s2.name)return false;
	if(s1.cmds.join() != s2.cmds.join())return false;
	if(s1.grp != s2.grp)return false;
	return true;
}
function scn_list_to_arr(obj)
{
	var l = obj.childNodes.length;
	if(l==0)return;
	
	var cmds = Array();
	for(var i=0;i<l;i++)
	{
		var id = obj.childNodes[i].id;
		var o = obj.childNodes[i].childNodes[1].innerHTML;
		
		var v=0;
		if(o=='ON')v=100;
		else if(o=='OFF')v=0;
		else v = parseInt(o,10);
		cmds[i] = id + "=" + v;
	}
	return cmds;	
	
}
function scn_dev_del(event)
{
	if (!event)event = window.event;
	var target = event.target ? event.target : event.srcElement;	

	if(target.className != 'del')return;
	var p = target.parentNode;
	p.parentNode.removeChild(p);
}
function scn_dev_html(i,val)
{
	if(val==null)val = 0;
	
	var s = '<div id="' + $devs[i].id + '">';
	s += '<span class="scn_nam">' + $devs[i].name + "</span>";
	if($devs[i].type=='dim'){
		if(val)s += '<span class="output on" onclick="output_click(this)">' + val + '%</span>';	
		else  s += '<span class="output" onclick="output_click(this)">' + val + '%</span>';
	}
	else{
		 if(val)s += '<span class="output on" onclick="output_click(this)">ON</span>';	
		 else s += '<span class="output" onclick="output_click(this)">OFF</span>';	
	}
	s += '<span class="del"></span>';
	s += '</div>';
	return s;	
}
function scn_remove_device(id)
{
	for(var i in $scenes)
	{
		for(var x in $scenes[i].cmds)
		{
			if(instr($scenes[i].cmds[x],id))$scenes[i].cmds.splice(x,1); 
		}
	}
}

function output_click(obj)
{

	if(obj.innerHTML == "ON")
	{
		obj.innerHTML = "OFF";
		obj.className = "output";
		return;
	}
	if(obj.innerHTML == "OFF")
	{
		obj.innerHTML = "ON";
		obj.className = "output on";
		return;
	}
	//dimmmer
	var l = parseInt(obj.innerHTML,10);
	l = l + 10;
	if(l>100)l=0;
	obj.innerHTML = l+'%';
	if(l>0)obj.className = "output on";
	else obj.className = "output";

}

function dev_choose()
{
	var s = '<div class="dlist" onclick="dev_choose_click(event)">';

	s += '<div id="cancel">Cancel</div>';	
	for(var i=0;i<$devs.length;i++)
	{
		if($devs[i].type != 'dim' && $devs[i].type != 'rel')continue;
		s += '<div id="' + i + '">' + $devs[i].name + '</div>';
	}
	s += '</div>';
	$('mpage').innerHTML = s;			
	$('modal').className = '';
}

function dev_choose_click(event)
{
	if (!event)event = window.event;
	var target = event.target ? event.target : event.srcElement;	
	$('mpage').innerHTML = '';
	$('modal').className = 'hide';
	if(target.id=='cancel')return;
	if($modal_cb)$modal_cb(target.id);
}

//-------------

function find_sched_key(k)
{
	for(var i in $scheds)
	{
		if(parseInt($scheds[i].key,10) == k)return i;
	}
	return -1;
	
}

function find_id(id)
{
	for (var i = 0; i < $devs.length; i++)
	{
		if ($devs[i].id == id)return i;
	}
	return null;
}
function find_devset(id)
{
	for (var i = 0; i < $devset.length; i++)
	{
		if ($devset[i].id == id)return i;
	}
	return null;
}
function find_scn(name)
{
	for (var i = 0; i < $scenes.length; i++)
	{
		if ($scenes[i].name == name)return i;
	}
	return null;
}

function find_grp(name)
{
	for (var i = 0; i < $layout.length; i++)
	{
		if ($layout[i].name == name)return i;
	}
	return null;	
}

function state_class(st)
{	
	if (st == '')return '_na';
	if (st == '0%')return 'dim_off';
	if (st == 'OFF')return 'rel_off';
	if (st == 'ON')return 'rel_on';
	return 'dim_on';
}

function isON(i)
{
	if ($devs[i].val == '0%' || $devs[i].val == 'OFF' || $devs[i].val == '')return 0;
	return 1;
}
//----------------------------
function inarray(needle, haystack) 
{
    var key = '';
        for (key in haystack) {
			
			if (haystack[key].indexOf(needle) > -1)return true;
        }
    return false;
}
function numbers(evt) 
{
	var theEvent = evt || window.event;
	var key = theEvent.keyCode || theEvent.which;
	if(key>=65){//a-z
		theEvent.returnValue = false;
		theEvent.preventDefault()
	}
}
function time_ago(unix_timestamp) {
	
	if(unix_timestamp=="")return "";
  var difference_in_seconds = (Math.round((new Date()).getTime() / 1000)) - unix_timestamp,
      current_date = new Date(unix_timestamp * 1000), minutes, hours,
      months = new Array(
        'January','February','March','April','May',
        'June','July','August','September','October',
        'November','December');
  
  if(difference_in_seconds<0)difference_in_seconds=0;
  if(difference_in_seconds < 60) {                                  
    return difference_in_seconds + " second" + _plural(difference_in_seconds) + " ago";
  } else if (difference_in_seconds < 60*60) {
    minutes = Math.floor(difference_in_seconds/60);
    return minutes + " minute" + _plural(minutes) + " ago";
  } else if (difference_in_seconds < 60*60*24) {
    hours = Math.floor(difference_in_seconds/60/60);
    return hours + " hour" + _plural(hours) + " ago";
  } else if (difference_in_seconds > 60*60*24){
    if(current_date.getYear() !== new Date().getYear()) 
      return current_date.getDay() + " " + months[current_date.getMonth()].substr(0,3) + " " + _fourdigits(current_date.getYear());
    
    return current_date.getDay() + " " + months[current_date.getMonth()].substr(0,3);
  }
  
  return difference_in_seconds;
  
  function _fourdigits(number)	{
        return (number < 1000) ? number + 1900 : number;}

  function _plural(number) {
    if(parseInt(number) === 1) {
      return "";
    }
    return "s";
  }
}

function Now()
{
 return parseInt(new Date().getTime()/1000,10);	
}


function modal_show(s)
{
	$('mpage').innerHTML = s;			
	$('modal').className = '';	
	window.scrollTo(0,0);
}
function modal_hide()
{
	$('mpage').className = '';	
	$('mpage').innerHTML = '';
	$('modal').className = 'hide';
}

function instr(str,find)
{
	if(str.indexOf(find)==-1)return false;
	return true;
}

function option_groups()
{
	var s ='';
	for( var i in $layout)
	{
		s += '<option>' + $layout[i].name + '</option>';
	}	
	return s;
}

function usb_err()
{
	$('icon').className = 'usb_err';
	$('title').innerHTML = 'USB Modem Removed';
	$('title').style.color = 'red';		
	$usb_ok = false;

}
function usb_ok()
{
	if($usb_ok)return;
	$usb_ok = true;
	$('icon').className = 'qs';
	$('title').innerHTML = 'QS Mobile';
	$('title').style.color = '#FFF';
}
function srv_err()
{
	$('title').innerHTML = 'Server Not Available!';
	$('title').style.color = 'red';		
	$srv_ok = false;
}
function srv_ok()
{
	if($srv_ok)return;
	$srv_ok = true;
	$('title').innerHTML = 'QS Mobile';
	$('title').style.color = '#FFF';
}

function ajax_post(url,data)
{
	//$call_back = callback;
	$xhr.open("POST",url,true);//async
	$xhr.send(data);
	return 1;//ajax is sent wait for reply
}

function status_time_read()
{
	
	var id = $devs[$i].id;
	var s = $host + '/'+ id + '/get/' + dechex(4);
	qs_tx(s,function (j){

		if(j.cmd=='ERROR')
		{
			alert("Error Reading Setting");
			return;
		}
		
		var ee = hexdec(j.data.substr(2,2));
		if(ee)var v = "Current Time is " + ee + " mins";
		else var v = "Status Updates are Disabled";
		alert(v);
	}); 
	
}

//---------------------------------------
function status_time_save()
{
	var n = prompt("\nEnter New time (1-255min or 0 to Disable)");
	if(n===null || n=='')return;
	var i = parseInt(n);
	if(i<0)return;
	if(i>255)return;
	
	var id = $devs[$i].id;
	var s = $host + '/'+ id + '/set/' + dechex(4) + dechex(i);
	qs_tx(s,function (j){

		if(j.cmd=='ERROR')
		{
			alert("Error Saving!");
			return;
		}
		alert("Setting Updated");
	}); 
}

//--------------------------------------
//for legacy support
function legacy_status(st)
{
	
	if(st=='7e')return 'OFF';
	if(st=='7f')return 'ON';
		
	if(st.length==6)//old
	{
		var l = hexdec(st.substr(4));
		
		if(st.substr(0,2)=='01')//old dim
		{	
			var d = 125-l;
			d = (d/125)*100;
			return d + '%';
		}
		if(st.substr(0,2)=='02')//old rel
		{
			if(l==127)return 'ON';
			else return 'OFF';
		}		
	}
	
	return st;
	
}

//-------------------------------------------

