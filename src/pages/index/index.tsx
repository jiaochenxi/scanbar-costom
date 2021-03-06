import Taro, {Component, Config} from '@tarojs/taro'
import {View, Text} from '@tarojs/components'
import {connect} from '@tarojs/redux'
import './index.less'
import '../style/product.less'
import ProductListView from '../../component/product/product.listview'
import ProductMenu from '../../component/product/product.menu'
import IndexAddress from './component/address'
import DiscountInfo from './component/discountInfo'
import Banner from './component/banner'
import invariant from 'invariant'
import {ProductAction, MerchantAction, UserAction} from '../../actions'
import {ResponseCode, ProductInterface} from '../../constants'
import WeixinSdk from '../../common/sdk/weixin/weixin'
import orderAction from '../../actions/order.action'
import TabsChoose from '../../component/tabs/tabs.choose'
import {getMerchantAdvertisement, getCurrentMerchantDetail} from '../../reducers/app.merchant'
import {LoginManager} from '../../common/sdk'
import CouponModal from '../../component/coupon/coupon.modal'
import {getUserinfo, getMemberInfo} from '../../reducers/app.user'
import {BASE_PARAM} from '../../common/util/config'

const cssPrefix = 'product';

class Index extends Component<any> {

    readonly state = {
        currentType: {
            name: '',
            id: 0,
            createTime: '',
            subCategory: [],
        },
        loading: false,
        isOpen: false,
        showActivity: true,
        couponModalShow: false,
        obtainCouponList: [],
    };

    common = {
        refreshFlag: false,
        timeoutFlag: false,
        changeTypeFlag: false,
    }

    /**
     * 指定config的类型声明为: Taro.Config
     *
     * 由于 typescript 对于 object 类型推导只能推出 Key 的基本类型
     * 对于像 navigationBarTextStyle: 'black' 这样的推导出的类型是 string
     * 提示和声明 navigationBarTextStyle: 'black' | 'white' 类型冲突, 需要显示声明类型
     */
    config: Config = {
        navigationBarTitleText: '首页'
    }

    async componentDidMount() {
        try {
            this.init(true);
            orderAction.orderAllStatus();
        } catch (error) {
            Taro.showToast({
                title: error.message,
                icon: 'none'
            })
        }
        this.setState({couponModalShow: true})
    }

    async componentDidShow() {
        // const { userinfo } = this.props;
        // if (userinfo.phone && userinfo.phone.length > 0) {
        //   UserAction.getMemberInfo();
        //   const res = await UserAction.obtainCoupon();
        //   if (res.code == ResponseCode.success) {
        //     this.setState({ obtainCouponList: res.data.rows })
        //   }
        // }
        this.init();
    }

    public changeCurrentType = (typeInfo: any, fetchProduct: boolean = true) => {
        this.setState({currentType: typeInfo}, async () => {
            if (fetchProduct) {
                this.fetchData(typeInfo);
            }
        });
    }

    public initAddress = async () => {
        /**
         * @todo 判断当前
         */
    }

    public init = async (firstTime?: boolean): Promise<void> => {
        try {
            MerchantAction.merchantList();
            await LoginManager.getUserInfo();
            WeixinSdk.initAddress();
            const {userinfo, currentMerchantDetail} = this.props;
            if (userinfo.phone && userinfo.phone.length > 0) {
                UserAction.getMemberInfo();
                const res = await UserAction.obtainCoupon();
                if (res.code == ResponseCode.success) {
                    this.setState({obtainCouponList: res.data.rows})
                }
            }
            const productTypeResult = await ProductAction.productInfoType({
                merchantId: currentMerchantDetail && currentMerchantDetail.id ? currentMerchantDetail.id : 1
            });
            invariant(productTypeResult.code === ResponseCode.success, productTypeResult.msg || ' ');
            const {data} = productTypeResult;
            const firstType = data[0] || {};
            if (firstTime) {
                this.changeCurrentType(firstType);
            }
        } catch (error) {
            Taro.showToast({
                title: error.message,
                icon: 'none'
            });
        }
    }

    /**
     * @todo [点击菜单的时候修改当前菜单并跳转至对应商品]
     *
     * @memberof ProductOrder
     */
    public onTypeClick = (params: ProductInterface.ProductTypeInfo) => {
        this.common.changeTypeFlag = true;
        this.changeCurrentType(params);
    }

    public fetchData = async (type: any) => {
        const {currentMerchantDetail} = this.props;
        this.setState({loading: true});
        const result = await ProductAction.productInfoList({
            type: `${type.id}`,
            status: 0,
            saleType: 0,
            merchantId: currentMerchantDetail && currentMerchantDetail.id ? currentMerchantDetail.id : 1
        } as any);
        if (this.common.changeTypeFlag) {
            this.common.changeTypeFlag = false;
            this.common.refreshFlag = true;
            if (!result || !result.data || !Array.isArray(result.data.rows)) {
                this.common.refreshFlag = false;
            }
        }
        this.setState({loading: false});
        return result;
    }

    public onScrollToLower = async () => {
        const {currentType} = this.state;
        const {productType} = this.props;
        for (let i = 0; i < productType.length; i++) {
            if (currentType.id === productType[i].id && (i !== productType.length - 1)) {
                this.onTypeClick(productType[i + 1]);
                break;
            }
        }
    }

    public getTabs = (tabs: any[]) => {
        const {currentType} = this.state;
        let newTabs = [...tabs];
        newTabs.unshift({id: currentType.id, name: '全部'});
        return newTabs;
    }

    public onScroll = (event: any) => {
        const {detail} = event;
        const {scrollTop} = detail;
        const { refreshFlag } = this.common;
        if (refreshFlag) {
            if (!this.common.timeoutFlag) {
                this.common.timeoutFlag = true;
                setTimeout(() => {
                    this.common.timeoutFlag = false;
                    this.common.refreshFlag = false;
                }, 200);
            }
            return;
        }
        if (Number(scrollTop) >= 50) {
            if (this.state.showActivity === true) {
                this.setState({showActivity: false});
            }
        } else {
            if (Number(scrollTop) <= 10) {
                this.setState({showActivity: true});
            }
        }
    }

    render() {
        const {currentType, loading, showActivity, obtainCouponList} = this.state;
        const {productList, productType, advertisement, userinfo, memberInfo} = this.props;

        return (
            <View className={`container ${cssPrefix}`}>
                <IndexAddress/>
                {/* <ScrollView scrollY={true}> */}
                {
                    showActivity && (
                        <View className={`${cssPrefix}-activity`}>
                            {userinfo && userinfo.phone && userinfo.phone.length > 0 &&
                            <DiscountInfo/>
                            }
                            {
                                advertisement && advertisement.length > 0 && (
                                    <Banner advertisement={advertisement}/>
                                )
                            }
                        </View>
                    )
                }
                <View className={`${cssPrefix}-list-container-costom`}>
                    <ProductMenu
                        menu={productType}
                        currentMenu={currentType}
                        onClick={(type) => this.onTypeClick(type)}
                    />
                    <View className={`${cssPrefix}-list-right`}>
                        <View className={`${cssPrefix}-list-right-types`}>
                            {
                                currentType && currentType.subCategory && currentType.subCategory.length > 0 ? (
                                    <View className={`${cssPrefix}-list-right-types-secondary`}>
                                        <TabsChoose
                                            tabs={this.getTabs(currentType.subCategory)}
                                            onChange={(type) => {
                                                this.fetchData(type)
                                            }}
                                            currentType={currentType}
                                        />
                                    </View>
                                ) : (
                                    <View
                                        className={`${cssPrefix}-list-right-header product-component-section-header-height`}>
                                        <View className={`${cssPrefix}-list-right-header-bge`}/>
                                        <Text
                                            className={`${cssPrefix}-list-right-header-text`}>{currentType.name}</Text>
                                    </View>
                                )
                            }
                        </View>
                        <ProductListView
                            loading={loading}
                            productList={productList}
                            className={`${cssPrefix}-list-right-container`}
                            onScroll={this.onScroll}
                        // onScrollToLower={this.onScrollToLower}
                    />
                </View>
            </View>
    {/* </ScrollView> */}
        <CouponModal
            isOpen={obtainCouponList.length > 0}
            onClose={() => {
                this.setState({obtainCouponList: []});
            }}
            couponList={obtainCouponList}
        />
    </View>
    )
    }
}

// #region 导出注意
//
// 经过上面的声明后需要将导出的 Taro.Component 子类修改为子类本身的 props 属性
// 这样在使用这个子类时 Ts 才不会提示缺少 JSX 类型参数错误
//
// #endregion

const select = (state) => {
    return {
        productType: state.product.productType,
        productList: state.product.productList,
        advertisement: getMerchantAdvertisement(state),
        currentMerchantDetail: getCurrentMerchantDetail(state),
        userinfo: getUserinfo(state),
        memberInfo: getMemberInfo(state)
    }
}

export default connect(select)(Index);
