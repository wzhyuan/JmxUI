//jmx.js
// jmx.js is the main engine for the web-based jmx editor.
// The code is organized thus:
// 1. the external api: init(), loadAndEdit(), save()
// 2. code that is directly used by #1: displayNode(), saveFile()
// 3. code used event handling after the file is loaded: xxxChanged(), editors etc.
// 4. code that's used by everyone - the common code : getElementKey()

(function() {

	var CONFIG = {};
	var ELEMENTS = {};
	var TEMPLATES = {};
	var JtlNodeList = new Array();
	var timeInterval=1000;//定义文件查询的时间间隔ms
	var intervalId;//文件查询时的Intervalid
	var sameNum=5;//文件加载连续相同次数
	var currentNum=0;//判断文件是否完成更新的指标，当连续{sameNum}次相同后，生成结果数据
	var JTL = function(t, lt, ts, s, lb, rc, rm, tn, dt, by) {
		/**
		 * @author Administrator
		 *
		 */
		this.t = t, this.lt = lt, this.ts = ts, this.s = s, this.lb = lb, this.rc = rc, this.rm = rm, this.tn = tn, this.dt = dt, this.by = by
	}
	function init(config) {
		loadConfigs(config);
		loadTemplates();

		function loadConfigs(config) {
			if (config) {
				CONFIG = config;
			} else {
				var configText = loadFile("lib/config.json", true);
				try {
					CONFIG = JSON.parse(configText.responseText);
				} catch (e) {
					throw e;
				}
			}
			var elementConfigText = loadFile("lib/jmxelements.json", true);
			try {
				ELEMENTS = JSON.parse(elementConfigText.responseText);
			} catch (e) {
				throw e;
			}
			// todo: add editors here if required
		}

		function loadTemplates() {
			for ( var el in ELEMENTS) {
				var element = ELEMENTS[el];
				loadTemplate(el, element);
			}
		}

		function loadTemplate(tref, e) {
			var template, tname;

			if (e.edit.view != undefined) {
				if (e.edit.view == false)
					return;
				if (e.edit.view != "GENERIC") {
					template = e.edit.view;
				} else {
					tname = e.edit.view;
				}
			} else {
				tname = tref;
			}

			if (!template) {
				var asynchttp = loadFile("tmpl/" + tname + ".tmpl", true);
				template = asynchttp.responseText;
			}
			TEMPLATES[tref] = template;
		}
	}
	/**
	 * 开始执行
	 * */
	function start(node,jmxFileName){
		//var jtlFileName=jmxFileName.replace(/jmx/g, "jtl");
		
		var sys = require('sys')
		var exec = require('child_process').exec;
		// executes `pwd`
		//exec("sh /home/acsno/wzy/jmx.js-master/start.sh", function (error, stdout, stderr) {
		exec("touch /home/acsno/wzy/www.txt", function (error, stdout, stderr) {
		console.log(stdout);
		if (error !== null) {
		console.log('exec error: ' + error);
		}
		});
		
		
		//intervalId=setInterval(function(){
		//	loadJtl(node,jtlFileName);
		//},timeInterval)
	//	alert("start")
	}
	/**
	 * 结束执行
	 * */
	function end(){
		clearInterval(intervalId);
		//alert("end")
	}
	/**
	 * 加载jtl文件
	 */
	function loadJtl(node, fileName) {
		var lastTimeJtlLength=JtlNodeList.length;
		JtlNodeList = new Array();
		try {
		var xmlhttp = loadFile(fileName);
		if(xmlhttp.status=404){
			xmlhttp.status=200;
			return false;
		}
		var xml = xmlhttp.responseXML;
		var nodes = xml.getElementsByTagName("httpSample");
		} catch (e) {
			return false;
			}
		var target = document.getElementById(node);
			// alert(nodes.length)
		var currentNode = null;
		for ( var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			currentNode = node;
			JtlNodeList.push(new JTL(attr("t"), attr("lt"), attr("ts"), attr("s"), attr("lb"), attr("rc"), attr("rm"), attr("tn"), attr("dt"), attr("by")));
		}
		if(JtlNodeList.length==lastTimeJtlLength){
			currentNum++;
		}
		// var table=document.createElement("table");
		// alert(JtlNodeList)
		var table = "<table border=\"1\" width=\"100%\">";
		table += "<tr>" +
				"<th>序号</th>" +
				"<th>Query的响应时间</th>" +
				"<th>空闲时间</th>" +
				"<th>Query的发送时间</th>" +
				"<th>返回结果</th>" +
				"<th>请求类型</th>" +
				"<th>返回码</th>" +
				"<th>响应信息</th>" +
				"<th>线程名字</th>" +
				"<th>响应文件的类型</th>" +
				"<th>请求和响应的字节数</th>" +
				"</tr>"
		for ( var i = 0; i < JtlNodeList.length; i++) {
			var jtl = JtlNodeList[i];
			currentNode = jtl;
			table += "<tr>";
			table += "<td>" + (i + 1) + "</td>";
			table += "<td>" + value("t") + "</td>";
			table += "<td>" + value("lt") + "</td>";
			table += "<td>" + value("ts") + "</td>";
			table += "<td>" + value("s") + "</td>";
			table += "<td>" + value("lb") + "</td>";
			table += "<td>" + value("rc") + "</td>";
			table += "<td>" + value("rm") + "</td>";
			table += "<td>" + value("tn") + "</td>";
			table += "<td>" + value("dt") + "</td>";
			table += "<td>" + value("by") + "</td>";
			table += "</tr>";
		}
		function attr(attrName) {
			return currentNode.getAttribute(attrName);
		}
		function value(attrName) {
			return currentNode[attrName]
		}
		target.innerHTML = table;
		// 添加判断条件，判断jtl文件是否已经加载完毕
		if (currentNum>sameNum) {
			loadResult();
		}
	}
	function loadResult() {
		end();
		document.getElementById("startbutton").value="开始";
		var result = "";
		// JTL结果解析过程中所需要的参数
		var successfulQueriesNum = 0; // 处理成功的query数
		var failedQueriesnum = 0; // 处理失败的query数
		var totalQueriesNum = 0; // 总Query数
		var maxResponseTime = 0; // 所有Query中的最大响应时间
		var performanceStartTime = new Date().getTime(); // 性能测试的开始时间
		var performanceEndTime = 0; // 性能测试的结束时间
		var totalSamplesResponseTime = 0; // 所有Query的总共响应时间
		// var sampleResponses = new Array(); // 所有Query的响应时间
		var throughput = 0;// 吞吐率
		for ( var i = 0; i < JtlNodeList.length; i++) {
			var jtl = JtlNodeList[i];
			// currentNode = jtl;
			// t对应的是Query的响应时间
			var responseTime = (jtl.t) * 1;
			totalSamplesResponseTime += responseTime;
			maxResponseTime = maxResponseTime < responseTime ? responseTime : maxResponseTime;
			// rc对应的是query的返回码
			++totalQueriesNum;
			if (jtl.rc == "200")
				++successfulQueriesNum;
			else
				++failedQueriesnum;
			var startTime = jtl.ts;
			performanceStartTime = performanceStartTime > startTime ? startTime : performanceStartTime;
			performanceEndTime = performanceEndTime > startTime ? performanceEndTime : startTime;
			throughput += (jtl.by) * 1;

		}
		var totalSpendedTime = performanceEndTime - performanceStartTime;
		result += "<p>FROM: " + new Date(performanceStartTime * 1).Format("yyyy-MM-dd hh:mm:ss")+ "</p>";
		result += "<p>END: " + new Date(performanceEndTime * 1).Format("yyyy-MM-dd hh:mm:ss") + "</p>";
		result += "<p> Sended Query Number:" + totalQueriesNum + "</p>";
		result += "<p>Total Spended Time(s): " + ((totalSpendedTime * 1) / 1000).toFixed(2) + "</p>";
		result += "<p>处理请求数: " + ((totalQueriesNum * 1) / ((totalSpendedTime * 1) / 1000)).toFixed(2) + "</p>";
		result += "<p>平均响应时间(ms): " + (totalSamplesResponseTime / totalQueriesNum).toFixed(0) + "</p>";
		result += "<p>最大响应时间(ms): " + maxResponseTime + "</p>";
		result += "<p>Query Success Number: " + successfulQueriesNum + "</p>";
		result += "<p>Query Failed Number:" + failedQueriesnum + "</p>";
		result += "<p>吞吐量(Kb/s): " + ((throughput / 1024) / (totalSpendedTime / 1000)).toFixed(2) + "</p>";

		// alert(result);
		document.getElementById("acs_xml").innerHTML = result;
	}
	function loadAndEdit(node, fileName) {
		var xmlhttp = loadFile(fileName);
		var jmxDoc = xmlhttp.responseXML;
		var target = document.getElementById(node);
		var jmxRoot = setupJMXRoot(target);
		displayNode(jmxDoc.documentElement, jmxRoot, jmxDoc, 0);
		return jmxDoc;

		function setupJMXRoot(target) {
			// clear the display node of any children
			// this clears out any previous jmx documents' displays
			while (target.firstChild) {
				target.removeChild(target.firstChild);
			}
			// then append a new jmx root
			var jmxRoot = document.createElement("div");
			target.appendChild(jmxRoot);
			return jmxRoot;
		}
	}

	function save(url, doc) {
		if (CONFIG["demo"] == false) {
			saveFile(url, doc);
		} else {
			throw "Unable to save due to demo mode being set."
		}
	}

	function displayNode(node, displayLoc, doc, VID) {

		// made VID a arg to enable more modularity. it is no longer a global
		// var, but passed in to the call
		// also its not incremented within displayNode, but by the caller.
		// since loadJMXFile will always call it with 0, processChildren() does
		// the incrementing.

		// Added back to support hashtree's children
		displayLoc.id = "jmx_" + (VID);
		// displayLoc.model = node;

		var elementKey = getElementKey(node);

		var config = ELEMENTS[elementKey];
		if (config) {
			createView();
			addInteractions();
			if (config.edit.processChildren || shouldProcessChildren()) {
				processChildren();
			}
		}

		function createView() {
			var view = generateView();
			positionViewInDiv(view);
			addRefToModel();
			// addCreateAffordances();

			function generateView() {
				var viewData = getAttrValues(node, config.edit.attrs, doc);
				var template = TEMPLATES[elementKey];
				viewData["vid"] = displayLoc.id;
				// This creates a structure like <div id="jmx.."><div>contents
				// of tmpl</div></div>.
				// The two enclosed divs are Ok because we're attaching model to
				// the div created here, while the template could create its own
				// div structure

				var view = template ? tmpl(template, viewData) : "";
				return view;

				function getAttrValues(node, attrs, doc) {
					var ret = {};
					for ( var a in attrs) {
						var attr = attrs[a];
						if (attr.get) {
							if (isFunctionName(attr.get)) {
								ret[a] = runFunction(attr.get, node);
							}
						} else if (attr.path) {
							ret[a] = getAttrValue(node, attr, doc);
						}
					}
					return ret;

					function getAttrValue(node, attr, doc) {
						var xpathApi = getXPathApis(attr.type || "string");
						if (attr.path == "") {
							return "";
						} else {
							return xpathApi.getValue(doc.evaluate(attr.path, node, null, xpathApi.type, null));
						}

						function getXPathApis(type) {
							switch (type) {
							case "string":
								return {
									"getValue" : function(xpr) {
										return xpr.stringValue;
									},
									"type" : XPathResult.STRING_TYPE
								};
								break;
							case "boolean":
								return {
									"getValue" : function(xpr) {
										return xpr.stringValue == "true" ? true : false;
									},
									"type" : XPathResult.STRING_TYPE
								};
								break;
							case "number":
							case "time":
								return {
									"getValue" : function(xpr) {
										return xpr.numberValue;
									},
									"type" : XPathResult.NUMBER_TYPE
								};
								break;
							}
						}
					}

					function isFunctionName(fnName) {
						return typeof (this[fnName]) == 'function';
					}

					function runFunction(fnName, node) {
						return this[fnName](node);
					}
				}
			}

			function positionViewInDiv(view) {
				if (displayLoc.innerHTML == "") {
					displayLoc.innerHTML = view;
				} else {
					// find where to put it by looking for a div with class
					// nodecontents
					var placeHolderDivs = displayLoc.getElementsByClassName("nodecontents");

					if (placeHolderDivs && placeHolderDivs[0]) { // if such a
						// node is
						// found,
						// replace
						// only that
						// node with
						// the new
						// contents
						var phDiv;
						phDiv = placeHolderDivs[0];

						// create a node with new contents
						var contentDiv = document.createElement("div");
						contentDiv.innerHTML = view;

						// replace that location alone with new contents
						displayLoc.replaceChild(contentDiv, phDiv);
					} else { // if not found, still replace the whole
						// displayLoc with the new contents
						displayLoc.innerHTML = view;
					}
				}
			}

			function addRefToModel() {
				var ctrlParent = displayLoc.getElementsByTagName("form");
				if (ctrlParent && ctrlParent[0]) {
					ctrlParent[0].model = node;
				}
			}

			// not used now, but will be after v1.0 release when i add ability
			// to create jmx files from scratch.
			function addCreateAffordances() {
				if (config.create && config.create.children) {
					if (config.create.length) {
						for ( var i = 0; i < config.create.children.length; i++) {
							addCtrlToAddChild(node, config.create.children[i]);
						}
						;
					} else {
						addCtrlToAddChild(node, config.create.children);
					}
				}

				// THIS MIGHT HAVE TO BE MOVED OUTSIDE DISPLAYNODE FOR USE IN
				// LIVE EDITING
				// This logic is weird because jmetertestPlan's TestPlan child
				// is not its direct xml child, but the child of an embedded
				// hashtree.
				// even worse, ThreadGroup's children are not in its xml node
				// tree at all, but in its sibling node. hashtree sucks.
				// need to make the addCtrltoAddChild logic separate from the
				// logic to determine based on jmx structure.

				function addCtrlToAddChild(node, childcfg) {
					// assume that all parent-child combos are siblings in a
					// hashtree
					if (node.parentElement.nodeName == "hashTree") {
						// find out of required number of children are already
						// in the document being edited
						var existingChildren = node.parentElement.getElementsByTagName(childcfg.name);
						var addAffordance = typeof (childcfg.allowed) == "string"
								|| (typeof (childcfg.allowed) == "number" && existingChildren.length > 0 && existingChildren.length <= childcfg.allowed);
						if (addAffordance) {
							var ctrl = document.createElement("input");
							ctrl.setAttribute("type", "button");
							ctrl.setAttribute("value", childcfg.name);
							displayLoc.appendChild(ctrl);
						}
					}
				}
			}
		}

		function addInteractions() {
			addEditors();
			addFolding();

			function addEditors() {
				var inputElements = displayLoc.getElementsByTagName("input");
				for ( var i = 0; i < inputElements.length; i++) {
					var inp = inputElements[i];
					var type = getType(inp);
					setEditor(inp, type);
				}
				;

				var textareaElements = displayLoc.getElementsByTagName("textarea");
				for ( var i = 0; i < textareaElements.length; i++) {
					var ta = textareaElements[i];
					var type = getType(ta);
					setEditor(ta, type);
				}
				;

				function getType(inp) {
					// look in the element's name for type. This is useful for
					// elements than manage their children's view
					var typeSrc, type;

					typeSrc = (config.edit && config.edit.attrs) ? config.edit.attrs[inp.name] : undefined;

					// if not found, look in the element's parent for type.
					// This is useful for generic handlers where type info
					// doesnt match the input element's name, but the containing
					// element
					if (!typeSrc) {
						typeSrc = config.edit;
					}

					type = typeSrc.type;
					// if nothing found, default to string
					if (!type)
						type = "string";
					return type;
				}

				function setEditor(inp, type) {
					// find an editor (action handler + editor view) by type
					// set it up for the inp node.
					var editor = EDITORS[type];
					if (editor) {
						inp.onfocus = editor.onfocus;
						inp.onchange = editor.onchange;
					}
					// TODO: decide if exception should be thrown if no type is
					// foun+d. Defaulting to any particular type's editor doesnt
					// seem to make sense.
				}
			}

			function addFolding() {
				var toggles1 = displayLoc.getElementsByClassName("toggleAttrs");
				for ( var i = 0; i < toggles1.length; i++) {
					var toggle = toggles1[i];
					toggle.onclick = toggleAttrs;
				}
				;

				var toggles2 = displayLoc.getElementsByClassName("toggleChildren");
				for ( var i = 0; i < toggles2.length; i++) {
					var toggle = toggles2[i];
					toggle.onclick = toggleChildren;
				}
				;

				function toggleAttrs(e) {
					var ctrl = e.srcElement;
					if (!ctrl)
						ctrl = e.target;

					// changed this only to test save of xml. needs to be
					// reverted/changed to logic mentioned in journal.
					expandOrCollapse(ctrl.parentElement.parentElement.parentElement.getElementsByClassName("body")[0]);
				}

				function toggleChildren(e) {
					var ctrl = e.srcElement;
					if (!ctrl)
						ctrl = e.target;

					expandOrCollapse(ctrl.nextElementSibling.nextElementSibling);
					ctrl.innerHTML = (ctrl.innerHTML.trim() == "^" ? " > " : " ^ ");
				}

				// from
				// http://stackoverflow.com/questions/4261363/javascript-html-toggle-visibility-automatically-causing-one-div-element-to-h
				// modified with answer from
				// http://stackoverflow.com/questions/195951/change-an-elements-css-class-with-javascript
				function expandOrCollapse(e) {
					if (e.classList.contains('expanded')) {
						e.classList.remove('expanded');
						e.classList.add('collapsed');
					} else {
						e.classList.remove('collapsed');
						e.classList.add('expanded');
					}
				}
			}
		}

		function shouldProcessChildren() {
			return displayLoc.getElementsByClassName(node.nodeName + "_children").length != 0;
		}

		function processChildren() {
			var dispChildren = setupDispNodeForChildren();
			displayChildren(dispChildren);

			function setupDispNodeForChildren() {
				var dispChildren;
				var childView = displayLoc.getElementsByClassName(node.nodeName + "_children");
				if (childView && childView[0]) {
					dispChildren = childView[0];
				} else {
					dispChildren = document.createElement("div");
					dispChildren.id = node.nodeName + "_children";
					dispChildren.setAttribute("class", node.nodeName + "_children");
					displayLoc.appendChild(dispChildren);
				}
				return dispChildren;
			}

			function displayChildren(dispChildren) {
				var n = node.children.length;
				for ( var i = 0; i < n; i++) {
					var child = node.children[i];
					var dispCNode = document.getElementById(displayLoc.id + "_child_" + i);
					if (!dispCNode) {
						dispCNode = document.createElement("div"); // NOTE:
						// this
						// creates
						// an
						// additional
						// level of
						// indent in
						// the div
						// structure
						dispChildren.appendChild(dispCNode);
					}
					displayNode(child, dispCNode, doc, VID++);
				}
				;
			}
		}
	}

	// adapted from http://www.w3schools.com/xml/xml_dom.asp
	function loadFile(fileName, isText) {
		try {
		if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera,
			// Safari
			xmlhttp = new XMLHttpRequest();
		} else {// code for IE6, IE5
			xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
		}
		xmlhttp.open("GET", fileName, false);
		if (isText) {
			xmlhttp.overrideMimeType("text/plain; charset=x-user-defined");
		}
		xmlhttp.send();
		} catch (e) {
			alert(e)
		}
		return xmlhttp;
	}

	function saveFile(url, doc) {
		if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera,
			// Safari
			xmlhttp = new XMLHttpRequest();
		} else {// code for IE6, IE5
			xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
		}
		xmlhttp.open("PUT", url, false);
		xmlhttp.send(doc);
		return xmlhttp;
	}

	// code to handle events and editing controls of the loaded jmx file starts
	// here
	// the xxxChanged() functions are used by the EDITOR gobal var; hence
	// defined earlier.

	function stringChanged(event) {
		var ctrl = event.srcElement;
		if (!ctrl)
			ctrl = event.target;

		// alert("control:" + ctrl.name +" old val:" + ctrl.defaultValue + " new
		// value:" + ctrl.value);
		updateModel(ctrl, ctrl.value);
	}

	function booleanChanged(event) {
		var ctrl = event.srcElement;
		if (!ctrl)
			ctrl = event.target;

		// alert("control:" + ctrl.name +" old val:" + ctrl.defaultValue + " new
		// value:" + ctrl.value);
		updateModel(ctrl, ctrl.checked ? "true" : "false");
	}

	function xmlChanged(event) {
		var ctrl = event.srcElement;
		if (!ctrl)
			ctrl = event.target;

		updateModel(ctrl, ctrl); // passing the ctrl itself so updateModel
		// will treat it as an obj. kludge.
	}

	function updateModel(ctrl, newValue) {
		var model = ctrl.form.model;

		var elementKey = getElementKey(model);
		var element = ELEMENTS[elementKey];
		var attrKey = element.edit.attrs[ctrl.name] ? ctrl.name : "value";
		var attr = element.edit.attrs[attrKey];
		var results = document.evaluate(attr.path, model, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
		var nodeToupdate = results.iterateNext();
		if (nodeToupdate) {
			if (typeof (newValue) == 'object') { // replace the contents of
				// the node if so.
				replaceContents(nodeToupdate, newValue);
				return;
			}
			// if a value exists, update it
			if (nodeToupdate.childNodes.length > 0) {
				nodeToupdate.childNodes[0].nodeValue = newValue;
			}
			// else create a new text node and add it.
			else {
				// dont know why innerHTML doesnt work here. createNode and
				// appending it only seems to work.
				nodeToupdate.appendChild(document.createTextNode(newValue));
			}
		}

		function replaceContents(node, ctrl) {
			var doc = parseFromString("<root>" + ctrl.value + "</root>"); // expected
			// to
			// error
			// out
			// if
			// not
			// valid
			// xml.
			// chrome returns no error, but returns an error msg as valid xml
			// am doing the remove+add new instead of replace because I dont
			// want to do node.parent.replacechild.
			// that might erase references to node held in the view.
			removeContents(node);
			addNewContents(node, doc);

			function parseFromString(str) {
				var parser, doc;
				if (window.DOMParser) {
					parser = new DOMParser();
					doc = parser.parseFromString(str, "text/xml");
				} else {
					doc = new ActiveXObject("Microsoft.XMLDOM");
					doc.async = false;
					doc.loadXML(str);
				}
				return doc;
			}

			function removeContents(node) {
				while (node.firstChild) {
					node.removeChild(node.firstChild);
				}
			}

			function addNewContents(node, doc) {
				var root = doc.firstChild;
				while (root.firstChild) {
					node.appendChild(root.firstChild);
				}
			}
		}
	}

	/*
	 * The EDITORS global var holds all the editors by type of element to be
	 * edited. Supported types are string, boolean and number; although more can
	 * be added. There are two attributes in each entry: onfocus (OPTIONAL):
	 * this is intended to be used when you want to present a custom editor for
	 * the element, eg, a date/time picker onchange (REQUIRED): this is intended
	 * to be used to notify the framework of the new value. It is based on type
	 * to trigger the correct DOM event handler and to get at the value
	 * correctly. Then handler function set here is expected to call
	 * updateModel() at some point.
	 */
	var EDITORS = {
		"string" : {
			onchange : stringChanged
		},
		"boolean" : {
			onchange : booleanChanged
		},
		"number" : {
			onchange : stringChanged
		},
		"time" : {
			onchange : stringChanged
		},
		"xml" : {
			onchange : xmlChanged
		}
	};

	// getElementKey is used both by the load side and the save side, hence its
	// here.
	function getElementKey(node) {
		return (ELEMENTS[node.nodeName]) ? node.nodeName : (node.attributes.guiclass && ELEMENTS[node.attributes.guiclass.value] ? node.attributes.guiclass.value : "DEFAULT");
	}

	this.JMX = {
		"init" : init,
		"loadAndEdit" : loadAndEdit,
		"save" : save,
		"loadJtl" : loadJtl,
		"start":start,
		"end":end
	};

})();

// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S") ==> 2006-7-2 8:9:4.18
Date.prototype.Format = function(fmt) {
	var o = {
		"M+" : this.getMonth() + 1, // 月份
		"d+" : this.getDate(), // 日
		"h+" : this.getHours(), // 小时
		"m+" : this.getMinutes(), // 分
		"s+" : this.getSeconds(), // 秒
		"q+" : Math.floor((this.getMonth() + 3) / 3), // 季度
		"S" : this.getMilliseconds()
	// 毫秒
	};
	if (/(y+)/.test(fmt))
		fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
	for ( var k in o)
		if (new RegExp("(" + k + ")").test(fmt))
			fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
	return fmt;
}
