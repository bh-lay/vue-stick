import template from './template.html'
import { getImgSize, getScrollTop } from './utils.js'

var component = {
	props: {
		list: {
			// type: Array,
			// default: []
		},
		columnWidth: {
			type: Number,
			default: 300
		},
		loadTriggerDistance: {
			type: Number,
			default: 200
		},
		loadMoreFn: {
			type: Function
		},
		columnSpacing: {
			type: Number,
			default: 20
		}
	},
	data: function () {
		return {
			count: 0,
			outerHeight: 200,

			columnWidthInUse: 0,
			columnCount: 0,

			localList: [],
			lastRowBottomPosition: [],
			lastTriggerScrollTime: 0,

			widgetIDMax: 0
		}
	},
	template: template,
	mounted: function () {
		var me = this;

		this.lastRowBottomPosition = [];

		var resizeDelay;
		this.resizeListener = function () {
			clearTimeout(resizeDelay);
			resizeDelay = setTimeout(function () {
				me.refresh();
			}, 500);
		};
		document.addEventListener('scroll', this.scrollListener)
		window.addEventListener('resize', this.resizeListener)
		this.buildLayout();
		this.syncList()
	},
	methods: {
		buildLayout: function () {
			var width = this.$refs.stickOuter.clientWidth;
			// this.localList = [];
			this.lastRowBottomPosition = [];
			this.columnCount = Math.max(Math.floor((width + this.columnSpacing) / (this.columnWidth + this.columnSpacing)), 1);
			if (this.columnCount === 1) {
				this.columnWidthInUse = width
			} else {
				this.columnWidthInUse = (width + this.columnSpacing) / this.columnCount - this.columnSpacing
			}

		},
		refresh: function () {
			var me = this
			this.buildLayout();

			this.localList.forEach(function (widget) {
				widget.style.top = 0
				widget.style.left = 0
				widget.style.width = me.columnWidthInUse
				widget.style.visibility = 'hidden'
			})
			this.$nextTick(function () {
				me.lastRowBottomPosition = []
				me.localList.forEach(function (widget) {
					var node = me.$refs['widget-' + widget.id][0]
					me.fixItemPosition(node, widget);
				})
			})
		},
		scrollListener: function () {
			var now = new Date().getTime();
			if (now - this.lastTriggerScrollTime > 500 && (getScrollTop() + window.innerHeight >= document.body.scrollHeight - this.loadTriggerDistance)) {
				this.loadMoreFn && this.loadMoreFn();
				this.lastTriggerScrollTime = now;
			}
		},
		syncList: function (list) {
			var me = this
			let listInScreen = this.localList.map(item => item.data)
			this.list.forEach(function (item) {
				if (listInScreen.indexOf(item) === -1) {
					me.addItem(item, item.cover)
				}
			})
		},
		addItem: function (item, cover) {
			var widget = {
				id: this.widgetIDMax++,
				style: {
					position: 'relative',
					top: 0,
					left: 0,
					width: this.columnWidthInUse,
					visibility: 'hidden'
				},
				data: item
			};
			var me = this

			this.localList.push(widget)
			getImgSize(cover, function () {
				var node = me.$refs['widget-' + widget.id][0]
				me.fixItemPosition(node, widget);
			});
		},
		fixItemPosition: function (node, widget) {
			var columnIndex;
			var top = 0;
			var widgetHeight = node.clientHeight
			if (this.lastRowBottomPosition.length < this.columnCount) {
				//第一排item
				columnIndex = this.lastRowBottomPosition.length;
				this.lastRowBottomPosition.push(widgetHeight);
			} else {
				//其余
				top = Math.min.apply(null, this.lastRowBottomPosition);
				columnIndex = this.lastRowBottomPosition.indexOf(top);
				top = top + this.columnSpacing;
			}
			widget.style.position = 'absolute'
			widget.style.visibility = 'visible'
			widget.style.top = top
			widget.style.left = columnIndex * (this.columnWidthInUse + this.columnSpacing)

			node.classList.add('fadeInLeft');
			setTimeout(function () {
				node.classList.remove('fadeInLeft');
			}, 1000);
			this.lastRowBottomPosition[columnIndex] = top + widgetHeight;
			this.outerHeight = Math.max.apply(null, this.lastRowBottomPosition) + this.columnSpacing
		},
		destroy: function () {
			document.removeEventListener('scroll', this.scrollListener)
			window.removeEventListener('resize', this.resizeListener)
		}
	},
	watch: {
		list: function () {
			this.syncList()
		}
	}
}


export default {
	component,
	install(Vue) {
		Vue.component('Stick', component);
	}
}
