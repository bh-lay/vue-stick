import './style.less'
import { getImgSize, getScrollTop } from './utils.js'

var component = {
	props: {
		list: {
			type: Array,
			default: []
		},
		columnWidth: {
			type: Number,
			default: 280
		},
		animationClass: {
			type: String,
			default: 'stick-fade-in'
		},
		loadTriggerDistance: {
			type: Number,
			default: 1000
		},
		columnSpacing: {
			type: Number,
			default: 10
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

			widgetIDMax: 0,
			resizeTimer: null
		}
	},
	render: function (createElement) {
		var me = this
		return createElement(
			'div',
			{
				class: ['vue-stick-outer'],
				ref: 'stickOuter',
				style: {
					height: this.outerHeight + 'px'
				}
			},
			this.localList.map(function (item) {
				return createElement(
					'div',
					{
						class: ['vue-stick-item'],
						ref: 'widget-' + item.id,
						key: item.id,
						style: {
							position: item.style.position,
							visibility: item.style.visibility,
							width: Math.round(item.style.width) + 'px',
							top: Math.round(item.style.top) + 'px',
							left: Math.round(item.style.left) + 'px'
						}
					},
					[
						me.$scopedSlots.default({
							data: item.data
						})
					]
				)
			})
		)
	},
	mounted: function () {
		this.lastRowBottomPosition = [];
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
					var node = me.$refs['widget-' + widget.id]
					if (widget.prepared) {
						me.fixItemPosition(node, widget)
					}
				})
			})
		},
		scrollListener: function () {
			var now = new Date().getTime()

			if (now - this.lastTriggerScrollTime > 500 && (getScrollTop() + window.innerHeight + this.loadTriggerDistance >= document.body.scrollHeight)) {
				this.$emit('onScrollEnd')
				this.lastTriggerScrollTime = now;
			}
		},
		resizeListener: function () {
			var me = this
			clearTimeout(this.resizeTimer);
			this.resizeTimer = setTimeout(function () {
				me.refresh();
			}, 500);
		},
		syncList: function () {
			var me = this
			var listInProps = this.list
			var listInScreen = this.localList.map(function (item) {
				return item.data
			})
			// 查找增量数据
			listInProps.forEach(function (item) {
				if (listInScreen.indexOf(item) === -1) {
					me.addItem(item)
				}
			})
			// 逆序查找被删除的数据
			var hasDeletedData = false
			for (var index = listInScreen.length - 1; index >= 0; index--) {
				if (listInProps.indexOf(listInScreen[index]) === -1) {
					hasDeletedData = true
					this.localList.splice(index, 1)
				}
			}
			hasDeletedData && me.refresh()
		},
		addItem: function (item) {
			var me = this
			var widget = {
				id: this.widgetIDMax++,
				style: {
					position: 'relative',
					top: 0,
					left: 0,
					width: this.columnWidthInUse,
					visibility: 'hidden'
				},
				prepared: false,
				data: item
			}

			this.localList.push(widget)
			this.$nextTick(function () {
				var widgetNode = me.$refs['widget-' + widget.id]
				var imgNode = widgetNode.querySelector('img')
				var imgSrc = imgNode ? imgNode.getAttribute('src') : ''
				
				getImgSize(imgSrc, function () {
					// 标记已准备好
					widget.prepared = true
					widgetNode.classList.add(me.animationClass)
					setTimeout(function () {
						widgetNode.classList.remove(me.animationClass)
					}, 1000)
					me.fixItemPosition(widgetNode, widget)
				});
			})
		},
		fixItemPosition: function (node, widget) {
			var columnIndex
			var top = 0
			if (!node || !widget) {
				return
			}
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

			this.lastRowBottomPosition[columnIndex] = top + widgetHeight;
			this.outerHeight = Math.max.apply(null, this.lastRowBottomPosition) + this.columnSpacing
		}
	},
	watch: {
		list: function () {
			this.syncList()
		}
	},
	beforeDestroy: function () {
		document.removeEventListener('scroll', this.scrollListener)
		window.removeEventListener('resize', this.resizeListener)
	}
}


export default {
	component,
	install: function (Vue) {
		Vue.component('Stick', component);
	}
}
