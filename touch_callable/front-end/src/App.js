import React, { Component } from 'react';
import { HashRouter, Route, Link, Switch } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { List, Form, Input, Button, DatePicker, Modal, Layout, Radio, Divider, PageHeader, InputNumber } from 'antd';
import axios from 'axios';
import './App.css';

import { updateCallables } from './reducers'


const { Header, Content, Footer } = Layout;

class Callables extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    const { setCallables } = this.props

    axios.get('callable')
      .then(response => {
        setCallables(response.data)
      });

  }

  render() {
    return (
      <List
        itemLayout="horizontal"
        dataSource={this.props.callables}
        renderItem={item => (
          <List.Item>
            <List.Item.Meta
              title={<Link to={`/callable/${item.callable_name}`}>{item.callable_name}</Link>}
              description={item.title}
            />
          </List.Item>
        )}
      />
    );
  }
}

const mapStateToProps = state => {
  return {
    callables: state.callables
  }
}

const mapDispatchToProps = dispatch => {
  return bindActionCreators({
    setCallables: updateCallables
  }, dispatch)
}

const ReduxCallables = connect(mapStateToProps, mapDispatchToProps)(Callables)

class CallableForm extends React.Component {

  constructor(props) {
    super(props)
    const { callables } = this.props

    this.state = {
      visible: false,
      response: null,
      callables: callables,
    };
  }

  componentDidMount() {
    const { setCallables } = this.props

    axios.get('callable')
      .then(response => {
        setCallables(response.data)
      });

  }

  handleSubmit = e => {
    e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        axios.post(`callable/${this.props.match.params.name}`, values)
          .then((response) => {
            if (response.data.status === 'success') {
              this.showSuccessModal(response.data.result)
            } else {
              this.showErrorModal(response.data.result)
            }
          });
      }

    });
  };

  showSuccessModal(result) {
    Modal.success({
      title: '执行成功',
      content: result,
    });
  }

  showErrorModal(result) {
    Modal.error({
      title: '执行失败',
      content: result,
    });
  }

  setCallable = () => {
    let callableName = this.props.match.params.name;
    var callableInfo
    for (callableInfo of this.props.callables) {
      if (callableInfo.callable_name === callableName) {
        this.callable = callableInfo
        break
      }
    }
  };

  buildFormItem = (parameter, index, array) => {
    const { getFieldDecorator } = this.props.form;

    let parameterName = parameter.name
    let inputWidget
    switch (parameter.annotation) {
      case 'str':
        inputWidget = <Input allowClear />;
        break
      case 'float':
        inputWidget = <InputNumber allowClear />;
        break
      case 'int':
        inputWidget = <InputNumber parser={value => Math.floor(value)} allowClear />;
        break
      case 'bool':
        inputWidget = <Radio.Group buttonStyle="solid">
          <Radio.Button value={true}>True</Radio.Button>
          <Radio.Button value={false}>False</Radio.Button>
        </Radio.Group>;
        break
      case 'datetime':
        inputWidget = <DatePicker showTime allowClear />;
        break
      case 'Enum':
        inputWidget = <Radio.Group buttonStyle="solid">
          {
            parameter.enum_values.map((value, index, array) =>
              <Radio.Button value={value}>{value}</Radio.Button>
            )
          }
        </Radio.Group>;
        break
      default:
        inputWidget = <Input />;
    }

    return <Form.Item label={parameterName} key={index}>
      {getFieldDecorator(parameterName, {
        initialValue: parameter.default,
        rules: [{ required: parameter['required'], message: `请输入${parameterName}!` }],
      })(inputWidget)}
    </Form.Item>
  }

  render() {
    this.setCallable()

    return (
      <PageHeader
        style={{
          border: '1px solid rgb(235, 237, 240)',
        }}
        onBack={() => this.props.history.push('/')}
        title="功能列表"
      >
        <Form layout="vertical" onSubmit={this.handleSubmit}>
          <Divider>{this.callable ? this.callable.callable_name : ''}</Divider>
          <pre>{this.callable && this.callable.doc ? this.callable.doc : '没有文档'}</pre>
          {
            this.callable && this.callable.parameters.length ? <Divider>参数填写</Divider> : []
          }

          {
            this.callable ? this.callable.parameters.map(this.buildFormItem) : []
          }
          <Form.Item>
            <Button type="primary" htmlType="submit" wrapperCol={{ span: 12, offset: 6 }} block>
              运行
            </Button>
          </Form.Item>
        </Form>
      </PageHeader>
    );
  }
}

const WrappedCallableForm = Form.create({ name: 'callablForm' })(CallableForm);

const mapStateToFormProps = state => {
  return {
    callables: state.callables
  }
}

const ReduxWrappedCallableForm = connect(mapStateToFormProps, mapDispatchToProps)(WrappedCallableForm)


class App extends Component {

  componentDidMount() {
    document.title = "Touch-Callable"
  }

  render() {
    return (
      <Layout className="layout" style={{ minHeight: '10000px' }}>
        <Header>
          <p style={{ color: 'white' }}>Touch Callable</p>
        </Header>
        <Content style={{ margin: '0 auto', width: '700px' }}>
          <HashRouter>
            <Switch>
              <Route exact path='/' component={ReduxCallables} />
              <Route path='/callable/:name' component={ReduxWrappedCallableForm} />
            </Switch>
          </HashRouter>
        </Content>
        <Footer style={{ textAlign: 'center' }}>Touch Callable</Footer>
      </Layout>
    )
  }
}

export default App;
